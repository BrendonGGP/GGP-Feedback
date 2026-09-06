import type { AccountStatus } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import {
  ACCESS_ROLES,
  canAdministerSystem,
  hasValidRoleCombination,
  type AccessRole,
} from "@/lib/authorization/access-control";
import { prisma } from "@/lib/prisma";

export const MANAGED_ACCOUNT_STATUSES = [
  "PENDING_ACTIVATION",
  "ACTIVE",
  "LOCKED",
  "DISABLED",
] as const satisfies readonly AccountStatus[];

const managedRoleSchema = z.enum(ACCESS_ROLES);
const managedStatusSchema = z.enum(MANAGED_ACCOUNT_STATUSES);

const accountUpdateSchema = z.object({
  accountId: z.string().uuid(),
  status: managedStatusSchema,
  roles: z.array(managedRoleSchema).min(1),
});

const accountListFilterSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  status: managedStatusSchema.optional(),
});

export type AccountManagementFilters = Readonly<{
  query?: string;
  status?: string;
}>;

export type ManagedAccountUpdateInput = Readonly<{
  accountId: string;
  status: string;
  roles: readonly string[];
}>;

export type AccountManagementData = Readonly<{
  metrics: Readonly<{
    totalAccounts: number;
    activeAccounts: number;
    attentionAccounts: number;
    activeSessions: number;
  }>;
  filters: Readonly<{
    query: string;
    status?: AccountStatus;
  }>;
  filteredTotal: number;
  resultLimited: boolean;
  accounts: readonly {
    id: string;
    fullName: string;
    jobTitle: string;
    companyName: string;
    departmentName: string;
    corporateEmail: string | null;
    loginIdentifier: string;
    status: AccountStatus;
    roles: readonly AccessRole[];
    mustChangePassword: boolean;
    lastLoginAt: string | null;
    activeSessions: number;
    isCurrent: boolean;
  }[];
}>;

export type AccountMutationResult = Readonly<{
  ok: boolean;
  message: string;
}>;

type ParsedAccountUpdate =
  | Readonly<{
      ok: true;
      data: Readonly<{
        accountId: string;
        status: AccountStatus;
        roles: readonly AccessRole[];
      }>;
    }>
  | Readonly<{ ok: false; message: string }>;

const mutationError = (message: string): AccountMutationResult => ({
  ok: false,
  message,
});

const sortedUniqueRoles = (roles: readonly AccessRole[]): AccessRole[] => {
  const selected = new Set(roles);
  return ACCESS_ROLES.filter((role) => selected.has(role));
};

export const parseManagedAccountUpdate = (
  input: unknown,
): ParsedAccountUpdate => {
  const parsed = accountUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Revise o status e os papéis selecionados." };
  }

  const roles = sortedUniqueRoles(parsed.data.roles);
  if (!hasValidRoleCombination(roles)) {
    return {
      ok: false,
      message:
        "Administrador do Sistema deve ser o único papel atribuído à conta.",
    };
  }

  return {
    ok: true,
    data: {
      accountId: parsed.data.accountId,
      status: parsed.data.status,
      roles,
    },
  };
};

export const getSystemAccountManagement = async (
  actor: AuthenticatedActor,
  filters: AccountManagementFilters = {},
): Promise<AccountManagementData | null> => {
  if (!canAdministerSystem(actor)) return null;

  const parsedFilters = accountListFilterSchema.safeParse(filters);
  const safeFilters = parsedFilters.success
    ? parsedFilters.data
    : { query: "", status: undefined };
  const now = new Date();
  const query = safeFilters.query;
  const where = {
    ...(safeFilters.status ? { status: safeFilters.status } : {}),
    ...(query
      ? {
          OR: [
            { loginIdentifier: { contains: query, mode: "insensitive" as const } },
            { person: { fullName: { contains: query, mode: "insensitive" as const } } },
            {
              person: {
                corporateEmail: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [
    totalAccounts,
    activeAccounts,
    attentionAccounts,
    activeSessions,
    filteredTotal,
    accounts,
  ] = await prisma.$transaction([
    prisma.accessAccount.count(),
    prisma.accessAccount.count({ where: { status: "ACTIVE" } }),
    prisma.accessAccount.count({
      where: { status: { in: ["PENDING_ACTIVATION", "LOCKED", "DISABLED"] } },
    }),
    prisma.userSession.count({
      where: { revokedAt: null, expiresAt: { gt: now } },
    }),
    prisma.accessAccount.count({ where }),
    prisma.accessAccount.findMany({
      where,
      take: 100,
      orderBy: { person: { fullName: "asc" } },
      select: {
        id: true,
        loginIdentifier: true,
        status: true,
        mustChangePassword: true,
        lastLoginAt: true,
        person: {
          select: {
            fullName: true,
            jobTitle: true,
            corporateEmail: true,
            company: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        roles: { select: { role: true } },
        _count: {
          select: {
            sessions: {
              where: { revokedAt: null, expiresAt: { gt: now } },
            },
          },
        },
      },
    }),
  ]);

  return {
    metrics: { totalAccounts, activeAccounts, attentionAccounts, activeSessions },
    filters: safeFilters,
    filteredTotal,
    resultLimited: filteredTotal > accounts.length,
    accounts: accounts.map((account) => ({
      id: account.id,
      fullName: account.person.fullName,
      jobTitle: account.person.jobTitle,
      companyName: account.person.company.name,
      departmentName: account.person.department.name,
      corporateEmail: account.person.corporateEmail,
      loginIdentifier: account.loginIdentifier,
      status: account.status,
      roles: sortedUniqueRoles(account.roles.map(({ role }) => role)),
      mustChangePassword: account.mustChangePassword,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      activeSessions: account._count.sessions,
      isCurrent: account.id === actor.accountId,
    })),
  };
};

export const updateManagedAccount = async (
  actor: AuthenticatedActor,
  input: ManagedAccountUpdateInput,
): Promise<AccountMutationResult> => {
  if (!canAdministerSystem(actor)) {
    return mutationError("Você não tem permissão para administrar contas.");
  }

  const parsed = parseManagedAccountUpdate(input);
  if (!parsed.ok) return parsed;
  if (parsed.data.accountId === actor.accountId) {
    return mutationError(
      "Sua própria conta é protegida. Solicite a outro administrador para alterá-la.",
    );
  }

  const account = await prisma.accessAccount.findUnique({
    where: { id: parsed.data.accountId },
    select: { id: true, status: true, roles: { select: { role: true } } },
  });
  if (!account) return mutationError("Conta não encontrada.");

  const previousRoles = sortedUniqueRoles(account.roles.map(({ role }) => role));
  const sameRoles =
    previousRoles.length === parsed.data.roles.length &&
    previousRoles.every((role, index) => role === parsed.data.roles[index]);
  if (account.status === parsed.data.status && sameRoles) {
    return { ok: true, message: "Nenhuma alteração foi necessária." };
  }

  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.accessAccount.update({
      where: { id: account.id },
      data: {
        status: parsed.data.status,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    await transaction.accountRoleAssignment.deleteMany({
      where: { accountId: account.id },
    });
    await transaction.accountRoleAssignment.createMany({
      data: parsed.data.roles.map((role) => ({ accountId: account.id, role })),
      skipDuplicates: true,
    });
    await transaction.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: crypto.randomUUID(),
        action: "UPDATE_ACCESS_ACCOUNT",
        entityType: "ACCESS_ACCOUNT",
        entityId: account.id,
        result: "SUCCESS",
        metadata: {
          status: { from: account.status, to: parsed.data.status },
          roles: { from: previousRoles, to: parsed.data.roles },
          sessionsRevoked: true,
        },
      },
    });
  });

  return {
    ok: true,
    message: "Acesso atualizado e sessões anteriores revogadas.",
  };
};

export const revokeManagedAccountSessions = async (
  actor: AuthenticatedActor,
  accountId: string,
): Promise<AccountMutationResult> => {
  if (!canAdministerSystem(actor)) {
    return mutationError("Você não tem permissão para revogar sessões.");
  }

  const parsedId = z.string().uuid().safeParse(accountId);
  if (!parsedId.success) return mutationError("Conta inválida.");
  if (parsedId.data === actor.accountId) {
    return mutationError("Use a opção de sair para encerrar sua própria sessão.");
  }

  const account = await prisma.accessAccount.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  });
  if (!account) return mutationError("Conta não encontrada.");

  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.accessAccount.update({
      where: { id: account.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: crypto.randomUUID(),
        action: "REVOKE_ACCOUNT_SESSIONS",
        entityType: "ACCESS_ACCOUNT",
        entityId: account.id,
        result: "SUCCESS",
        metadata: { sessionsRevoked: true },
      },
    });
  });

  return { ok: true, message: "Sessões da conta revogadas." };
};
