import { randomUUID } from "node:crypto";

import type { AccountStatus } from "@prisma/client";
import { z } from "zod";

import {
  getPasswordPolicyError,
  hashPassword,
  PASSWORD_MAX_LENGTH,
} from "@/lib/auth/password";
import type { AuthenticatedActor } from "@/lib/auth/session";
import { usernameSchema } from "@/lib/auth/username";
import {
  ACCESS_ROLES,
  canAdministerSystem,
  hasValidRoleCombination,
  type AccessRole,
} from "@/lib/authorization/access-control";
import { adminPrisma } from "@/lib/infrastructure/database/prisma";

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

const accountCreationPasswordSchema = z
  .string()
  .max(
    PASSWORD_MAX_LENGTH,
    `A senha temporária pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  )
  .superRefine((value, context) => {
    const error = getPasswordPolicyError(value, "A senha temporária");
    if (error) context.addIssue({ code: "custom", message: error });
  });

const accountCreationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Informe o nome completo do colaborador.")
      .max(200, "O nome completo excede o limite permitido."),
    corporateEmail: z
      .string()
      .trim()
      .email("Informe um e-mail corporativo válido.")
      .max(254, "O e-mail corporativo excede o limite permitido."),
    jobTitle: z
      .string()
      .trim()
      .min(2, "Informe o cargo do colaborador.")
      .max(160, "O cargo excede o limite permitido."),
    employmentRegime: z
      .string()
      .trim()
      .min(2, "Informe o regime de contratação.")
      .max(80, "O regime excede o limite permitido."),
    companyId: z.string().uuid(),
    departmentId: z.string().uuid(),
    loginIdentifier: usernameSchema,
    roles: z.array(managedRoleSchema).min(1),
    temporaryPassword: accountCreationPasswordSchema,
    confirmPassword: accountCreationPasswordSchema,
  })
  .refine((value) => value.temporaryPassword === value.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

const accountListFilterSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  // The form sends an empty string when "Todos os status" is selected. Treat
  // that UI value as an omitted filter so it does not discard a valid search.
  status: z.preprocess(
    (value) => (value === "" ? undefined : value),
    managedStatusSchema.optional(),
  ),
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

export type ManagedAccountCreateInput = Readonly<{
  fullName: string;
  corporateEmail: string;
  jobTitle: string;
  employmentRegime: string;
  companyId: string;
  departmentId: string;
  loginIdentifier: string;
  roles: readonly string[];
  temporaryPassword: string;
  confirmPassword: string;
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
  organizationOptions: readonly {
    id: string;
    name: string;
    departments: readonly { id: string; name: string }[];
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

type ParsedAccountCreate =
  | Readonly<{
      ok: true;
      data: Readonly<{
        fullName: string;
        corporateEmail: string;
        jobTitle: string;
        employmentRegime: string;
        companyId: string;
        departmentId: string;
        loginIdentifier: string;
        roles: readonly AccessRole[];
        temporaryPassword: string;
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

export const parseAccountManagementFilters = (
  input: unknown,
): Readonly<{ query: string; status?: AccountStatus }> => {
  const parsed = accountListFilterSchema.safeParse(input);
  return parsed.success
    ? parsed.data
    : { query: "", status: undefined };
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

export const parseManagedAccountCreate = (
  input: unknown,
): ParsedAccountCreate => {
  const parsed = accountCreationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Revise os dados do novo usuário.",
    };
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
      fullName: parsed.data.fullName,
      corporateEmail: parsed.data.corporateEmail,
      jobTitle: parsed.data.jobTitle,
      employmentRegime: parsed.data.employmentRegime,
      companyId: parsed.data.companyId,
      departmentId: parsed.data.departmentId,
      loginIdentifier: parsed.data.loginIdentifier,
      roles,
      temporaryPassword: parsed.data.temporaryPassword,
    },
  };
};

export const getSystemAccountManagement = async (
  actor: AuthenticatedActor,
  filters: AccountManagementFilters = {},
): Promise<AccountManagementData | null> => {
  if (!canAdministerSystem(actor)) return null;

  const safeFilters = parseAccountManagementFilters(filters);
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
    organizationOptions,
  ] = await adminPrisma.$transaction([
    adminPrisma.accessAccount.count(),
    adminPrisma.accessAccount.count({ where: { status: "ACTIVE" } }),
    adminPrisma.accessAccount.count({
      where: { status: { in: ["PENDING_ACTIVATION", "LOCKED", "DISABLED"] } },
    }),
    adminPrisma.userSession.count({
      where: { revokedAt: null, expiresAt: { gt: now } },
    }),
    adminPrisma.accessAccount.count({ where }),
    adminPrisma.accessAccount.findMany({
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
    adminPrisma.company.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        departments: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
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
    organizationOptions,
  };
};

export const createManagedAccount = async (
  actor: AuthenticatedActor,
  input: ManagedAccountCreateInput,
): Promise<AccountMutationResult> => {
  if (!canAdministerSystem(actor)) {
    return mutationError("Você não tem permissão para criar contas.");
  }

  const parsed = parseManagedAccountCreate(input);
  if (!parsed.ok) return parsed;

  const organization = await adminPrisma.company.findUnique({
    where: { id: parsed.data.companyId },
    select: {
      id: true,
      active: true,
      departments: {
        where: { id: parsed.data.departmentId },
        select: { id: true, active: true },
      },
    },
  });
  if (!organization || !organization.active) {
    return mutationError("Selecione uma empresa ativa.");
  }
  const department = organization.departments[0];
  if (!department || !department.active) {
    return mutationError("Selecione um departamento ativo da empresa escolhida.");
  }

  const loginInUse = await adminPrisma.accessAccount.findFirst({
    where: {
      loginIdentifier: {
        equals: parsed.data.loginIdentifier,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (loginInUse) {
    return mutationError("Este nome de usuário já está em uso.");
  }

  const emailInUse = await adminPrisma.person.findFirst({
    where: {
      corporateEmail: {
        equals: parsed.data.corporateEmail,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (emailInUse) {
    return mutationError("Este e-mail corporativo já está vinculado a uma pessoa.");
  }

  const passwordHash = await hashPassword(parsed.data.temporaryPassword);
  try {
    await adminPrisma.$transaction(async (transaction) => {
      const person = await transaction.person.create({
        data: {
          companyId: parsed.data.companyId,
          departmentId: parsed.data.departmentId,
          fullName: parsed.data.fullName,
          corporateEmail: parsed.data.corporateEmail,
          jobTitle: parsed.data.jobTitle,
          employmentRegime: parsed.data.employmentRegime,
          active: true,
        },
        select: { id: true },
      });
      const account = await transaction.accessAccount.create({
        data: {
          personId: person.id,
          loginIdentifier: parsed.data.loginIdentifier,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: true,
          roles: {
            create: parsed.data.roles.map((role) => ({ role })),
          },
        },
        select: { id: true },
      });

      await transaction.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          requestId: randomUUID(),
          action: "CREATE_ACCESS_ACCOUNT",
          entityType: "ACCESS_ACCOUNT",
          entityId: account.id,
          result: "SUCCESS",
          metadata: {
            personId: person.id,
            fullName: parsed.data.fullName,
            companyId: parsed.data.companyId,
            departmentId: parsed.data.departmentId,
            loginIdentifier: parsed.data.loginIdentifier,
            roles: parsed.data.roles,
            mustChangePassword: true,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return mutationError(
        "Não foi possível criar a conta: o nome de usuário ou o e-mail já está em uso.",
      );
    }
    return mutationError("Não foi possível criar a conta de acesso.");
  }

  return {
    ok: true,
    message: "Usuário criado. A pessoa deverá trocar a senha no próximo acesso.",
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

  const account = await adminPrisma.accessAccount.findUnique({
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
  await adminPrisma.$transaction(async (transaction) => {
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

/**
 * Removes only the access identity. The functional person and its history are
 * intentionally preserved so feedback and reporting records remain intact.
 */
export const deleteManagedAccount = async (
  actor: AuthenticatedActor,
  accountId: string,
): Promise<AccountMutationResult> => {
  if (!canAdministerSystem(actor)) {
    return mutationError("VocÃª nÃ£o tem permissÃ£o para excluir contas.");
  }

  const parsedId = z.string().uuid().safeParse(accountId);
  if (!parsedId.success) return mutationError("Conta invÃ¡lida.");
  if (parsedId.data === actor.accountId) {
    return mutationError("Sua prÃ³pria conta Ã© protegida e nÃ£o pode ser excluÃ­da.");
  }

  try {
    await adminPrisma.$transaction(async (transaction) => {
      const account = await transaction.accessAccount.findUnique({
        where: { id: parsedId.data },
        select: { id: true, roles: { select: { role: true } } },
      });
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");

      const isSystemAdmin = account.roles.some(({ role }) => role === "SYSTEM_ADMIN");
      if (isSystemAdmin) {
        // Serialize this check so concurrent deletions cannot remove the last
        // system administrator.
        await transaction.$executeRaw`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('system-admin-deletion', 0))`;
        const systemAdminCount = await transaction.accountRoleAssignment.count({
          where: { role: "SYSTEM_ADMIN" },
        });
        if (systemAdminCount <= 1) throw new Error("LAST_SYSTEM_ADMIN");
      }

      await transaction.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          requestId: randomUUID(),
          action: "DELETE_ACCESS_ACCOUNT",
          entityType: "ACCESS_ACCOUNT",
          entityId: account.id,
          result: "SUCCESS",
          metadata: {
            roles: account.roles.map(({ role }) => role),
            personRecordPreserved: true,
            sessionsRevokedByCascade: true,
          },
        },
      });
      await transaction.accessAccount.delete({ where: { id: account.id } });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ACCOUNT_NOT_FOUND") return mutationError("Conta nÃ£o encontrada.");
    if (code === "LAST_SYSTEM_ADMIN") {
      return mutationError("NÃ£o Ã© possÃ­vel excluir o Ãºltimo Administrador do Sistema.");
    }
    return mutationError("NÃ£o foi possÃ­vel excluir a conta.");
  }

  return {
    ok: true,
    message: "Acesso excluÃ­do. O cadastro funcional e o histÃ³rico foram preservados.",
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

  const account = await adminPrisma.accessAccount.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  });
  if (!account) return mutationError("Conta não encontrada.");

  const now = new Date();
  await adminPrisma.$transaction(async (transaction) => {
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
