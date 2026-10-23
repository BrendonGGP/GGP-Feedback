import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import {
  canAdministerHrDomain,
  canAdministerSystem,
  type AccessRole,
} from "@/lib/authorization/access-control";
import { withDatabaseActor } from "@/lib/infrastructure/database/actor-context";
import { recordAuditEvent } from "@/lib/infrastructure/database/audit";
import { adminPrisma, runtimePrisma as prisma } from "@/lib/infrastructure/database/prisma";

import { disableAccountOfPerson } from "./account-access";
import { wouldCreateHierarchyCycle, type OrganizationMutationResult } from "./organization-management";

/*
 * Operações de acesso e ciclo de vida de pessoas feitas pelo RH (out/2026).
 *
 * Contas e papéis ficam fora do alcance da role de runtime, então são lidos e
 * alterados pelo cliente administrativo, sempre depois da checagem de
 * permissão. Quando uma pessoa perde o acesso, a conta é desativada ANTES de
 * mexer no cadastro: se algo falhar no meio, o resultado é sem acesso (fail
 * closed), nunca acesso a mais.
 */

const ok = (message: string): OrganizationMutationResult => ({ ok: true, message, fieldErrors: {} });
const fail = (message: string): OrganizationMutationResult => ({ ok: false, message, fieldErrors: {} });

/** Perfis que o RH pode atribuir. Papel de RH e de administrador seguem com o admin. */
export const HR_ASSIGNABLE_PROFILES = ["MANAGER", "EMPLOYEE"] as const;
export type HrAssignableProfile = (typeof HR_ASSIGNABLE_PROFILES)[number];

export type AccessProfile = Readonly<{
  accountId: string;
  status: string;
  roles: readonly AccessRole[];
}>;

/** Papéis e status das contas das pessoas informadas (só para quem administra RH). */
export const getAccessProfiles = async (
  actor: AuthenticatedActor,
  personIds: readonly string[],
): Promise<ReadonlyMap<string, AccessProfile>> => {
  if (!canAdministerHrDomain(actor) || personIds.length === 0) return new Map();
  const accounts = await adminPrisma.accessAccount.findMany({
    where: { personId: { in: [...personIds] } },
    select: { id: true, personId: true, status: true, roles: { select: { role: true } } },
  });
  return new Map(
    accounts.map((account) => [
      account.personId,
      { accountId: account.id, status: account.status, roles: account.roles.map(({ role }) => role) },
    ]),
  );
};

// ── Perfil de acesso ─────────────────────────────────────────────────────

const profileInputSchema = z.object({
  personId: z.string().uuid(),
  profile: z.enum(HR_ASSIGNABLE_PROFILES),
});

/**
 * RH alterna o perfil funcional da conta entre gestor e colaborador. Não toca
 * no papel de RH nem no de administrador. Gestor entra no portal; colaborador
 * não (decisão de out/2026). A troca encerra as sessões abertas da conta.
 */
export const updateHrAccessProfile = async (
  actor: AuthenticatedActor,
  input: unknown,
): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return fail("Você não tem permissão para alterar perfis.");
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return fail("Revise o perfil informado.");

  const account = await adminPrisma.accessAccount.findUnique({
    where: { personId: parsed.data.personId },
    select: { id: true, roles: { select: { role: true } } },
  });
  if (!account) return fail("Esta pessoa ainda não tem conta de acesso. Peça ao administrador do sistema para criá-la.");
  if (account.id === actor.accountId) return fail("Você não pode alterar o seu próprio perfil.");

  const current = account.roles.map(({ role }) => role);
  if (current.includes("SYSTEM_ADMIN")) return fail("O perfil do administrador do sistema não pode ser alterado pelo RH.");

  const wantsManager = parsed.data.profile === "MANAGER";
  const next = new Set<AccessRole>(current);
  next.add("EMPLOYEE");
  if (wantsManager) next.add("MANAGER");
  else next.delete("MANAGER");
  const nextRoles = [...next].sort();
  if (JSON.stringify(nextRoles) === JSON.stringify([...current].sort())) return ok("O perfil já estava assim.");

  const now = new Date();
  await adminPrisma.$transaction(async (transaction) => {
    await transaction.accountRoleAssignment.deleteMany({
      where: { accountId: account.id, role: { in: ["MANAGER", "EMPLOYEE"] } },
    });
    await transaction.accountRoleAssignment.createMany({
      data: nextRoles
        .filter((role) => role === "MANAGER" || role === "EMPLOYEE")
        .map((role) => ({ accountId: account.id, role })),
    });
    await transaction.accessAccount.update({
      where: { id: account.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await transaction.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: randomUUID(),
        action: "UPDATE_ACCESS_PROFILE",
        entityType: "ACCESS_ACCOUNT",
        entityId: account.id,
        result: "SUCCESS",
        metadata: { personId: parsed.data.personId, from: current, to: nextRoles, sessionsRevoked: true },
      },
    });
  });

  return ok(wantsManager ? "Perfil alterado para gestor." : "Perfil alterado para colaborador (sem acesso ao portal).");
};

// ── Exclusão lógica ──────────────────────────────────────────────────────

const deleteInputSchema = z.object({
  personId: z.string().uuid(),
  version: z.coerce.number().int().positive(),
  reason: z.string().trim().max(240).optional(),
});

/**
 * RH exclui uma pessoa da plataforma (exclusão lógica): ela some das telas,
 * perde o acesso e o histórico de feedbacks fica preservado. Fica registrado
 * quem excluiu e quando; o administrador do sistema pode restaurar.
 */
export const deleteHrPerson = async (
  actor: AuthenticatedActor,
  input: unknown,
): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return fail("Você não tem permissão para excluir pessoas.");
  const parsed = deleteInputSchema.safeParse(input);
  if (!parsed.success) return fail("Revise os dados da exclusão.");
  if (parsed.data.personId === actor.personId) return fail("Você não pode excluir o seu próprio cadastro.");

  const target = await withDatabaseActor(actor, () =>
    prisma.person.findUnique({
      where: { id: parsed.data.personId },
      select: {
        id: true,
        deletedAt: true,
        _count: { select: { directReports: { where: { active: true, deletedAt: null } } } },
      },
    }),
  );
  if (!target || target.deletedAt) return fail("Pessoa não encontrada.");
  if (target._count.directReports > 0) {
    return fail("Transfira os liderados desta pessoa para outro gestor antes de excluí-la.");
  }

  const roles = await adminPrisma.accountRoleAssignment.findMany({
    where: { account: { personId: target.id } },
    select: { role: true },
  });
  if (roles.some(({ role }) => role === "SYSTEM_ADMIN" || role === "HR_ADMIN")) {
    return fail("Contas de RH ou do administrador do sistema só podem ser removidas pelo administrador.");
  }

  // Fail closed: primeiro tira o acesso, depois marca a exclusão.
  const accountDisabled = await disableAccountOfPerson(target.id);

  const deleted = await withDatabaseActor(actor, async () => {
    try {
      return await prisma.$transaction(async (transaction) => {
        const result = await transaction.person.updateMany({
          where: { id: target.id, version: parsed.data.version, deletedAt: null },
          data: {
            active: false,
            deletedAt: new Date(),
            deletedByAccountId: actor.accountId,
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) return false;
        await recordAuditEvent(transaction, {
          data: {
            actorAccountId: actor.accountId,
            requestId: randomUUID(),
            action: "DELETE_PERSON",
            entityType: "PERSON",
            entityId: target.id,
            result: "SUCCESS",
            metadata: { logical: true, accountDisabled, reason: parsed.data.reason || null },
          },
        });
        return true;
      });
    } catch {
      return null;
    }
  });

  if (deleted === null) return fail("Não foi possível excluir agora. O acesso da pessoa já foi bloqueado; tente novamente.");
  if (!deleted) return fail("O cadastro foi alterado por outra pessoa. Atualize a página e tente novamente.");
  return ok("Pessoa excluída da plataforma. O histórico foi preservado e a ação ficou registrada.");
};

export type DeletedPerson = Readonly<{
  id: string;
  fullName: string;
  jobTitle: string;
  companyName: string;
  deletedAt: string;
  deletedByLogin: string | null;
}>;

/** Pessoas excluídas, para o administrador do sistema revisar e restaurar. */
export const listDeletedPeople = async (actor: AuthenticatedActor): Promise<readonly DeletedPerson[] | null> => {
  if (!canAdministerSystem(actor)) return null;
  const people = await adminPrisma.person.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 200,
    select: {
      id: true,
      fullName: true,
      jobTitle: true,
      deletedAt: true,
      company: { select: { name: true } },
      deletedBy: { select: { loginIdentifier: true } },
    },
  });
  return people.map((person) => ({
    id: person.id,
    fullName: person.fullName,
    jobTitle: person.jobTitle,
    companyName: person.company.name,
    deletedAt: (person.deletedAt ?? new Date(0)).toISOString(),
    deletedByLogin: person.deletedBy?.loginIdentifier ?? null,
  }));
};

/**
 * O administrador restaura uma pessoa excluída. Ela volta INATIVA e com a conta
 * desativada: o RH decide se reativa, para nada voltar ao ar sem revisão.
 */
export const restoreDeletedPerson = async (
  actor: AuthenticatedActor,
  personId: unknown,
): Promise<OrganizationMutationResult> => {
  if (!canAdministerSystem(actor)) return fail("Você não tem permissão para restaurar pessoas.");
  const parsed = z.string().uuid().safeParse(personId);
  if (!parsed.success) return fail("Pessoa inválida.");

  const restored = await adminPrisma.$transaction(async (transaction) => {
    const result = await transaction.person.updateMany({
      where: { id: parsed.data, deletedAt: { not: null } },
      data: { deletedAt: null, deletedByAccountId: null, active: false, version: { increment: 1 } },
    });
    if (result.count !== 1) return false;
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: randomUUID(),
        action: "RESTORE_PERSON",
        entityType: "PERSON",
        entityId: parsed.data,
        result: "SUCCESS",
        metadata: { restoredAs: "INACTIVE" },
      },
    });
    return true;
  });

  return restored
    ? ok("Pessoa restaurada como inativa. O RH pode reativá-la na estrutura organizacional.")
    : fail("Pessoa não encontrada entre as excluídas.");
};

// ── Transferência de liderados ───────────────────────────────────────────

const transferInputSchema = z.object({
  fromManagerId: z.string().uuid(),
  toManagerId: z.string().uuid(),
  reason: z.string().trim().max(240).optional(),
});

/** Transfere todos os liderados ativos de um gestor para outro, com histórico. */
export const transferHrDirectReports = async (
  actor: AuthenticatedActor,
  input: unknown,
): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return fail("Você não tem permissão para alterar a estrutura.");
  const parsed = transferInputSchema.safeParse(input);
  if (!parsed.success) return fail("Selecione o gestor atual e o novo gestor.");
  const { fromManagerId, toManagerId } = parsed.data;
  if (fromManagerId === toManagerId) return fail("Escolha um novo gestor diferente do atual.");

  return withDatabaseActor(actor, async () => {
    const [newManager, reports, hierarchy] = await Promise.all([
      prisma.person.findFirst({ where: { id: toManagerId, active: true, deletedAt: null }, select: { id: true } }),
      prisma.person.findMany({
        where: { managerId: fromManagerId, active: true, deletedAt: null },
        select: { id: true },
      }),
      prisma.person.findMany({ select: { id: true, managerId: true } }),
    ]);
    if (!newManager) return fail("Selecione um novo gestor ativo.");
    if (reports.length === 0) return fail("Este gestor não tem liderados ativos para transferir.");
    if (reports.some(({ id }) => id === toManagerId)) {
      return fail("O novo gestor é liderado do gestor atual. Mova-o individualmente antes.");
    }

    const managerByPersonId = new Map(hierarchy.map((item) => [item.id, item.managerId]));
    for (const { id } of reports) {
      if (await wouldCreateHierarchyCycle(id, toManagerId, async (personId) => managerByPersonId.get(personId))) {
        return fail("Essa transferência criaria um ciclo na hierarquia.");
      }
    }

    try {
      await prisma.$transaction(async (transaction) => {
        const changedAt = new Date();
        const ids = reports.map(({ id }) => id);
        await transaction.person.updateMany({
          where: { id: { in: ids } },
          data: { managerId: toManagerId, version: { increment: 1 } },
        });
        await transaction.reportingLineHistory.updateMany({
          where: { subordinateId: { in: ids }, validUntil: null },
          data: { validUntil: changedAt },
        });
        await transaction.reportingLineHistory.createMany({
          data: ids.map((subordinateId) => ({
            subordinateId,
            managerId: toManagerId,
            changedByAccountId: actor.accountId,
            validFrom: changedAt,
            reason: parsed.data.reason || "Transferência de liderados",
          })),
        });
        await recordAuditEvent(transaction, {
          data: {
            actorAccountId: actor.accountId,
            requestId: randomUUID(),
            action: "TRANSFER_DIRECT_REPORTS",
            entityType: "PERSON",
            entityId: fromManagerId,
            result: "SUCCESS",
            metadata: { toManagerId, count: ids.length },
          },
        });
      });
    } catch {
      return fail("Não foi possível transferir os liderados agora.");
    }

    return ok(`${reports.length} liderado(s) transferido(s) para o novo gestor.`);
  });
};
