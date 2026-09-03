import type { AccessRole } from "@/lib/authorization/access-control";
import type { AuthenticatedActor } from "@/lib/auth/session";
import { resolvePrimaryPortalRole } from "@/lib/auth/portal-routing";
import { prisma } from "@/lib/prisma";

export type DashboardMetric = Readonly<{
  label: string;
  value: string;
  helper: string;
  tone: "aqua" | "green" | "amber" | "neutral";
}>;

export type DashboardFeedbackSummary = Readonly<{
  drafts: number;
  submitted: number;
  completionRate: number;
}>;

export type PortalDashboardData = Readonly<{
  profile: Readonly<{
    fullName: string;
    firstName: string;
    jobTitle: string;
    department: string;
    company: string;
  }>;
  primaryRole: AccessRole;
  roleLabel: string;
  roleDescription: string;
  metrics: readonly DashboardMetric[];
  feedbackSummary: DashboardFeedbackSummary | null;
  cycle: Readonly<{
    name: string;
    endsAt: string;
  }> | null;
}>;

const roleLabels: Record<AccessRole, string> = {
  SYSTEM_ADMIN: "Administrador do Sistema",
  HR_ADMIN: "Recursos Humanos",
  MANAGER: "Gestor",
  EMPLOYEE: "Colaborador",
};

const roleDescriptions: Record<AccessRole, string> = {
  SYSTEM_ADMIN:
    "Administração técnica de contas e papéis, sem acesso ao conteúdo de feedback.",
  HR_ADMIN:
    "Visão funcional das empresas, pessoas, ciclos e feedbacks autorizados.",
  MANAGER:
    "Acompanhamento da equipe direta e dos feedbacks sob sua responsabilidade.",
  EMPLOYEE:
    "Acompanhamento dos feedbacks recebidos e das ações de desenvolvimento.",
};

const formatCount = (value: number): string =>
  new Intl.NumberFormat("pt-BR").format(value);

const formatCycleDate = (value: Date): string =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(value);

const getFeedbackSummary = (
  drafts: number,
  submitted: number,
): DashboardFeedbackSummary => {
  const total = drafts + submitted;
  return {
    drafts,
    submitted,
    completionRate: total === 0 ? 0 : Math.round((submitted / total) * 100),
  };
};

const getSystemAdministratorMetrics = async (): Promise<
  readonly DashboardMetric[]
> => {
  const now = new Date();
  const [activeAccounts, assignedRoles, activeSessions] =
    await prisma.$transaction([
      prisma.accessAccount.count({ where: { status: "ACTIVE" } }),
      prisma.accountRoleAssignment.count(),
      prisma.userSession.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
    ]);

  return [
    {
      label: "Contas ativas",
      value: formatCount(activeAccounts),
      helper: "identidades habilitadas",
      tone: "aqua",
    },
    {
      label: "Papéis atribuídos",
      value: formatCount(assignedRoles),
      helper: "vínculos de autorização",
      tone: "neutral",
    },
    {
      label: "Sessões ativas",
      value: formatCount(activeSessions),
      helper: "sessões válidas agora",
      tone: "green",
    },
    {
      label: "Conteúdo funcional",
      value: "Bloqueado",
      helper: "segregação de acesso ativa",
      tone: "amber",
    },
  ];
};

const getHrDashboard = async () => {
  const [activePeople, activeCompanies, openCycles, drafts, submitted, cycle] =
    await prisma.$transaction([
      prisma.person.count({ where: { active: true } }),
      prisma.company.count({ where: { active: true } }),
      prisma.cycle.count({ where: { status: "OPEN" } }),
      prisma.feedback.count({ where: { status: "DRAFT" } }),
      prisma.feedback.count({ where: { status: "SUBMITTED" } }),
      prisma.cycle.findFirst({
        where: { status: "OPEN" },
        orderBy: { endsAt: "asc" },
        select: { name: true, endsAt: true },
      }),
    ]);

  return {
    metrics: [
      {
        label: "Pessoas ativas",
        value: formatCount(activePeople),
        helper: "cadastros habilitados",
        tone: "aqua" as const,
      },
      {
        label: "Empresas ativas",
        value: formatCount(activeCompanies),
        helper: "no ambiente autorizado",
        tone: "neutral" as const,
      },
      {
        label: "Ciclos abertos",
        value: formatCount(openCycles),
        helper: "em acompanhamento",
        tone: "green" as const,
      },
      {
        label: "Feedbacks enviados",
        value: formatCount(submitted),
        helper: "registros concluídos",
        tone: "amber" as const,
      },
    ],
    feedbackSummary: getFeedbackSummary(drafts, submitted),
    cycle,
  };
};

const getManagerDashboard = async (personId: string) => {
  const [directReports, drafts, submitted, received, cycle] =
    await prisma.$transaction([
      prisma.person.count({ where: { managerId: personId, active: true } }),
      prisma.feedback.count({
        where: { evaluatorPersonId: personId, status: "DRAFT" },
      }),
      prisma.feedback.count({
        where: { evaluatorPersonId: personId, status: "SUBMITTED" },
      }),
      prisma.feedback.count({
        where: { subjectPersonId: personId, status: "SUBMITTED" },
      }),
      prisma.cycle.findFirst({
        where: { status: "OPEN" },
        orderBy: { endsAt: "asc" },
        select: { name: true, endsAt: true },
      }),
    ]);

  return {
    metrics: [
      {
        label: "Minha equipe",
        value: formatCount(directReports),
        helper: "liderados diretos ativos",
        tone: "aqua" as const,
      },
      {
        label: "Rascunhos",
        value: formatCount(drafts),
        helper: "feedbacks para concluir",
        tone: "amber" as const,
      },
      {
        label: "Feedbacks enviados",
        value: formatCount(submitted),
        helper: "sob sua autoria",
        tone: "green" as const,
      },
      {
        label: "Feedbacks recebidos",
        value: formatCount(received),
        helper: "sobre seu desenvolvimento",
        tone: "neutral" as const,
      },
    ],
    feedbackSummary: getFeedbackSummary(drafts, submitted),
    cycle,
  };
};

const getEmployeeDashboard = async (personId: string) => {
  const [received, drafts, submitted, cycle] = await prisma.$transaction([
    prisma.feedback.count({
      where: { subjectPersonId: personId, status: "SUBMITTED" },
    }),
    prisma.feedback.count({
      where: {
        subjectPersonId: personId,
        evaluatorPersonId: personId,
        status: "DRAFT",
      },
    }),
    prisma.feedback.count({
      where: {
        subjectPersonId: personId,
        evaluatorPersonId: personId,
        status: "SUBMITTED",
      },
    }),
    prisma.cycle.findFirst({
      where: { status: "OPEN" },
      orderBy: { endsAt: "asc" },
      select: { name: true, endsAt: true },
    }),
  ]);

  return {
    metrics: [
      {
        label: "Feedbacks recebidos",
        value: formatCount(received),
        helper: "registros concluídos",
        tone: "aqua" as const,
      },
      {
        label: "Autoavaliações",
        value: formatCount(submitted),
        helper: "respostas enviadas",
        tone: "green" as const,
      },
      {
        label: "Rascunhos",
        value: formatCount(drafts),
        helper: "itens para continuar",
        tone: "amber" as const,
      },
      {
        label: "PDI",
        value: "Próxima fase",
        helper: "fora do escopo atual do MVP",
        tone: "neutral" as const,
      },
    ],
    feedbackSummary: getFeedbackSummary(drafts, submitted),
    cycle,
  };
};

export const getPortalDashboardData = async (
  actor: AuthenticatedActor,
): Promise<PortalDashboardData | null> => {
  const primaryRole = resolvePrimaryPortalRole(actor.roles);
  if (!primaryRole) {
    return null;
  }

  const person = await prisma.person.findUnique({
    where: { id: actor.personId },
    select: {
      fullName: true,
      jobTitle: true,
      department: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  if (!person) {
    return null;
  }

  let metrics: readonly DashboardMetric[];
  let feedbackSummary: DashboardFeedbackSummary | null = null;
  let cycle: { name: string; endsAt: Date } | null = null;

  if (primaryRole === "SYSTEM_ADMIN") {
    metrics = await getSystemAdministratorMetrics();
  } else if (primaryRole === "HR_ADMIN") {
    const dashboard = await getHrDashboard();
    ({ metrics, feedbackSummary, cycle } = dashboard);
  } else if (primaryRole === "MANAGER") {
    const dashboard = await getManagerDashboard(actor.personId);
    ({ metrics, feedbackSummary, cycle } = dashboard);
  } else {
    const dashboard = await getEmployeeDashboard(actor.personId);
    ({ metrics, feedbackSummary, cycle } = dashboard);
  }

  return {
    profile: {
      fullName: person.fullName,
      firstName: person.fullName.trim().split(/\s+/)[0] ?? person.fullName,
      jobTitle: person.jobTitle,
      department: person.department.name,
      company: person.company.name,
    },
    primaryRole,
    roleLabel: roleLabels[primaryRole],
    roleDescription: roleDescriptions[primaryRole],
    metrics,
    feedbackSummary,
    cycle: cycle
      ? { name: cycle.name, endsAt: formatCycleDate(cycle.endsAt) }
      : null,
  };
};
