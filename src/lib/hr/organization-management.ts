import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { withDatabaseActor } from "@/lib/db/actor-context";
import { runtimePrisma as prisma } from "@/lib/prisma";

const uuidSchema = z.string().uuid("Selecione uma opção válida.");
const requiredName = (label: string, maximum: number) =>
  z.string().trim().min(2, `Informe ${label}.`).max(maximum, `${label} excede o limite permitido.`);

export const createCompanyInputSchema = z.object({
  name: requiredName("o nome da empresa", 160),
});

export const createDepartmentInputSchema = z.object({
  companyId: uuidSchema,
  name: requiredName("o nome do departamento", 160),
});

export const createPersonInputSchema = z.object({
  companyId: uuidSchema,
  departmentId: uuidSchema,
  managerId: z.string().trim().refine((value) => value === "" || z.string().uuid().safeParse(value).success, "Selecione um gestor válido."),
  fullName: requiredName("o nome completo", 200),
  corporateEmail: z.string().trim().max(254).refine((value) => value === "" || z.string().email().safeParse(value).success, "Informe um e-mail corporativo válido."),
  jobTitle: requiredName("o cargo", 160),
  employmentRegime: requiredName("o regime de contratação", 80),
});

export const updatePersonOrganizationInputSchema = z.object({
  personId: uuidSchema,
  companyId: uuidSchema,
  departmentId: uuidSchema,
  managerId: z.string().trim().refine((value) => value === "" || z.string().uuid().safeParse(value).success, "Selecione um gestor válido."),
  active: z.boolean(),
  reason: z.string().trim().max(240, "O motivo excede o limite permitido."),
  version: z.number().int().positive(),
});

export type OrganizationMutationResult = Readonly<{
  ok: boolean;
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
}>;

export type HrOrganizationData = Readonly<{
  metrics: Readonly<{
    activeCompanies: number;
    activeDepartments: number;
    activePeople: number;
    peopleWithoutManager: number;
  }>;
  companies: readonly {
    id: string;
    name: string;
    active: boolean;
    departments: readonly { id: string; name: string; active: boolean }[];
  }[];
  people: readonly {
    id: string;
    fullName: string;
    jobTitle: string;
    employmentRegime: string;
    active: boolean;
    version: number;
    companyId: string;
    companyName: string;
    departmentId: string;
    departmentName: string;
    managerId: string | null;
    managerName: string | null;
    directReportCount: number;
    hasAccount: boolean;
  }[];
}>;

type ManagerLoader = (personId: string) => Promise<string | null | undefined>;

export const wouldCreateHierarchyCycle = async (
  personId: string,
  managerId: string | null,
  loadManagerId: ManagerLoader,
): Promise<boolean> => {
  if (!managerId) return false;

  const visited = new Set<string>();
  let currentId: string | null | undefined = managerId;
  for (let depth = 0; currentId && depth < 200; depth += 1) {
    if (currentId === personId || visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = await loadManagerId(currentId);
    if (currentId === undefined) return true;
  }

  return currentId !== null;
};

const mutationError = (message: string, fieldErrors: Record<string, string> = {}): OrganizationMutationResult => ({
  ok: false,
  message,
  fieldErrors,
});

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const validationError = (error: z.ZodError): OrganizationMutationResult => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  }
  return mutationError("Revise os dados informados.", fieldErrors);
};

const slugify = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);

const writeAudit = (
  transaction: Prisma.TransactionClient,
  actor: AuthenticatedActor,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) => transaction.auditEvent.create({
  data: {
    actorAccountId: actor.accountId,
    requestId: crypto.randomUUID(),
    action,
    entityType,
    entityId,
    result: "SUCCESS",
    metadata,
  },
});

export const getHrOrganization = async (
  actor: AuthenticatedActor,
): Promise<HrOrganizationData | null> => {
  if (!canAdministerHrDomain(actor)) return null;

  return withDatabaseActor(actor, async () => {
  const [activeCompanies, activeDepartments, activePeople, peopleWithoutManager, companies, people] =
    await prisma.$transaction([
      prisma.company.count({ where: { active: true } }),
      prisma.department.count({ where: { active: true } }),
      prisma.person.count({ where: { active: true } }),
      prisma.person.count({ where: { active: true, managerId: null } }),
      prisma.company.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          active: true,
          departments: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, active: true },
          },
        },
      }),
      prisma.person.findMany({
        take: 200,
        orderBy: [{ active: "desc" }, { fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          jobTitle: true,
          employmentRegime: true,
          active: true,
          version: true,
          companyId: true,
          departmentId: true,
          managerId: true,
          company: { select: { name: true } },
          department: { select: { name: true } },
          manager: { select: { fullName: true } },
          account: { select: { id: true } },
          _count: { select: { directReports: { where: { active: true } } } },
        },
      }),
    ]);

  return {
    metrics: { activeCompanies, activeDepartments, activePeople, peopleWithoutManager },
    companies,
    people: people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      jobTitle: person.jobTitle,
      employmentRegime: person.employmentRegime,
      active: person.active,
      version: person.version,
      companyId: person.companyId,
      companyName: person.company.name,
      departmentId: person.departmentId,
      departmentName: person.department.name,
      managerId: person.managerId,
      managerName: person.manager?.fullName ?? null,
      directReportCount: person._count.directReports,
      hasAccount: person.account !== null,
    })),
  };
  });
};

export const createHrCompany = async (actor: AuthenticatedActor, input: unknown): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return mutationError("Você não tem permissão para cadastrar empresas.");
  const parsed = createCompanyInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const baseSlug = slugify(parsed.data.name);
  if (!baseSlug) return mutationError("Informe um nome de empresa válido.");
  return withDatabaseActor(actor, async () => {
  const duplicate = await prisma.company.findFirst({
    where: { OR: [{ name: { equals: parsed.data.name, mode: "insensitive" } }, { slug: baseSlug }] },
    select: { id: true },
  });
  if (duplicate) return mutationError("Já existe uma empresa com esse nome.");

  try {
    await prisma.$transaction(async (transaction) => {
      const company = await transaction.company.create({ data: { name: parsed.data.name, slug: baseSlug }, select: { id: true } });
      await writeAudit(transaction, actor, "CREATE", "COMPANY", company.id, { active: true });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return mutationError("Já existe uma empresa com esse nome.");
    return mutationError("Não foi possível cadastrar a empresa agora.");
  }
  return { ok: true, message: "Empresa cadastrada.", fieldErrors: {} };
  });
};

export const createHrDepartment = async (actor: AuthenticatedActor, input: unknown): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return mutationError("Você não tem permissão para cadastrar departamentos.");
  const parsed = createDepartmentInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  return withDatabaseActor(actor, async () => {
  const company = await prisma.company.findFirst({ where: { id: parsed.data.companyId, active: true }, select: { id: true } });
  if (!company) return mutationError("Selecione uma empresa ativa.");
  const duplicate = await prisma.department.findFirst({
    where: { companyId: company.id, name: { equals: parsed.data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) return mutationError("Esse departamento já existe na empresa selecionada.");

  try {
    await prisma.$transaction(async (transaction) => {
      const department = await transaction.department.create({ data: { companyId: company.id, name: parsed.data.name }, select: { id: true } });
      await writeAudit(transaction, actor, "CREATE", "DEPARTMENT", department.id, { companyId: company.id, active: true });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return mutationError("Esse departamento já existe na empresa selecionada.");
    return mutationError("Não foi possível cadastrar o departamento agora.");
  }
  return { ok: true, message: "Departamento cadastrado.", fieldErrors: {} };
  });
};

export const createHrPerson = async (actor: AuthenticatedActor, input: unknown): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return mutationError("Você não tem permissão para cadastrar pessoas.");
  const parsed = createPersonInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const managerId = parsed.data.managerId || null;

  return withDatabaseActor(actor, async () => {
  const [company, department, manager, duplicateEmail] = await Promise.all([
    prisma.company.findFirst({ where: { id: parsed.data.companyId, active: true }, select: { id: true } }),
    prisma.department.findFirst({ where: { id: parsed.data.departmentId, companyId: parsed.data.companyId, active: true }, select: { id: true } }),
    managerId ? prisma.person.findFirst({ where: { id: managerId, active: true }, select: { id: true } }) : null,
    parsed.data.corporateEmail ? prisma.person.findFirst({ where: { corporateEmail: { equals: parsed.data.corporateEmail, mode: "insensitive" } }, select: { id: true } }) : null,
  ]);
  if (!company || !department) return mutationError("Empresa e departamento precisam estar ativos e relacionados.");
  if (managerId && !manager) return mutationError("Selecione um gestor ativo.");
  if (duplicateEmail) return mutationError("Já existe uma pessoa com esse e-mail corporativo.");

  try {
    await prisma.$transaction(async (transaction) => {
      const person = await transaction.person.create({
        data: {
          companyId: company.id,
          departmentId: department.id,
          managerId,
          fullName: parsed.data.fullName,
          corporateEmail: parsed.data.corporateEmail || null,
          jobTitle: parsed.data.jobTitle,
          employmentRegime: parsed.data.employmentRegime,
        },
        select: { id: true },
      });
      await transaction.reportingLineHistory.create({
        data: { subordinateId: person.id, managerId, changedByAccountId: actor.accountId, reason: "Cadastro inicial" },
      });
      await writeAudit(transaction, actor, "CREATE", "PERSON", person.id, {
        companyId: company.id,
        departmentId: department.id,
        managerAssigned: managerId !== null,
        active: true,
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return mutationError("Já existe uma pessoa com esse e-mail corporativo.");
    return mutationError("Não foi possível cadastrar a pessoa agora.");
  }
  return { ok: true, message: "Pessoa cadastrada. A conta de acesso ainda não foi criada.", fieldErrors: {} };
  });
};

export const updateHrPersonOrganization = async (actor: AuthenticatedActor, input: unknown): Promise<OrganizationMutationResult> => {
  if (!canAdministerHrDomain(actor)) return mutationError("Você não tem permissão para alterar a estrutura.");
  const parsed = updatePersonOrganizationInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const managerId = parsed.data.managerId || null;
  if (managerId === parsed.data.personId) return mutationError("Uma pessoa não pode liderar a si mesma.");

  return withDatabaseActor(actor, async () => {
  const [person, company, department, manager] = await Promise.all([
    prisma.person.findUnique({
      where: { id: parsed.data.personId },
      select: {
        id: true,
        managerId: true,
        active: true,
        version: true,
        account: { select: { status: true } },
        _count: { select: { directReports: { where: { active: true } } } },
      },
    }),
    prisma.company.findFirst({ where: { id: parsed.data.companyId, active: true }, select: { id: true } }),
    prisma.department.findFirst({ where: { id: parsed.data.departmentId, companyId: parsed.data.companyId, active: true }, select: { id: true } }),
    managerId ? prisma.person.findFirst({ where: { id: managerId, active: true }, select: { id: true } }) : null,
  ]);
  if (!person) return mutationError("Pessoa não encontrada.");
  if (!company || !department) return mutationError("Empresa e departamento precisam estar ativos e relacionados.");
  if (managerId && !manager) return mutationError("Selecione um gestor ativo.");
  if (!parsed.data.active && person._count.directReports > 0) return mutationError("Realoque os liderados ativos antes de desativar esta pessoa.");
  if (!parsed.data.active && person.account && person.account.status !== "DISABLED") {
    return mutationError("Peça ao Administrador do Sistema para desabilitar a conta antes de desativar esta pessoa.");
  }

  const hierarchy = managerId
    ? await prisma.person.findMany({ select: { id: true, managerId: true } })
    : [];
  const managerByPersonId = new Map(hierarchy.map((item) => [item.id, item.managerId]));
  const hasCycle = await wouldCreateHierarchyCycle(
    person.id,
    managerId,
    async (id) => managerByPersonId.get(id),
  );
  if (hasCycle) return mutationError("Essa alteração criaria um ciclo na hierarquia.");

  const managerChanged = person.managerId !== managerId;
  let updated: boolean;
  try {
    updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.person.updateMany({
        where: { id: person.id, version: parsed.data.version },
        data: {
          companyId: company.id,
          departmentId: department.id,
          managerId,
          active: parsed.data.active,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) return false;

      if (managerChanged) {
        const changedAt = new Date();
        await transaction.reportingLineHistory.updateMany({
          where: { subordinateId: person.id, validUntil: null },
          data: { validUntil: changedAt },
        });
        await transaction.reportingLineHistory.create({
          data: {
            subordinateId: person.id,
            managerId,
            changedByAccountId: actor.accountId,
            validFrom: changedAt,
            reason: parsed.data.reason || "Alteração organizacional",
          },
        });
      }
      await writeAudit(transaction, actor, "UPDATE_ORGANIZATION", "PERSON", person.id, {
        companyId: company.id,
        departmentId: department.id,
        managerChanged,
        activeFrom: person.active,
        activeTo: parsed.data.active,
      });
      return true;
    });
  } catch {
    return mutationError("Não foi possível atualizar a estrutura agora.");
  }

  if (!updated) return mutationError("O cadastro foi alterado por outra pessoa. Atualize a página e tente novamente.");
  return { ok: true, message: "Estrutura da pessoa atualizada.", fieldErrors: {} };
  });
};
