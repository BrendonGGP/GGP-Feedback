import type { CycleStatus, QuestionType } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { prisma } from "@/lib/prisma";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateOnlySchema = z
  .string()
  .regex(DATE_ONLY_PATTERN, "Informe a data no formato correto.");

export const createCycleInputSchema = z
  .object({
    name: z.string().trim().min(3, "Informe um nome para o ciclo.").max(160),
    startsAt: dateOnlySchema,
    endsAt: dateOnlySchema,
    templateId: z.string().uuid("Selecione um formulário válido."),
    selfAssessmentEnabled: z.boolean(),
  })
  .superRefine((value, context) => {
    const startsAt = parseDateOnly(value.startsAt);
    const endsAt = parseDateOnly(value.endsAt);

    if (!startsAt || !endsAt) {
      context.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Informe datas válidas.",
      });
      return;
    }

    if (endsAt <= startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "A data final deve ser posterior à data inicial.",
      });
    }
  });

export type CycleCreateInput = z.infer<typeof createCycleInputSchema>;

export type HrCycleManagementData = Readonly<{
  metrics: Readonly<{
    activePeople: number;
    openCycles: number;
    activeTemplates: number;
    feedbacks: number;
  }>;
  cycles: readonly {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    status: CycleStatus;
    selfAssessmentEnabled: boolean;
    feedbackCount: number;
    templates: readonly {
      id: string;
      name: string;
      version: number;
      questionCount: number;
    }[];
  }[];
  templates: readonly {
    id: string;
    name: string;
    version: number;
    questions: readonly {
      id: string;
      prompt: string;
      type: QuestionType;
      position: number;
      required: boolean;
      minimum: number | null;
      maximum: number | null;
    }[];
  }[];
}>;

export type CycleMutationResult = Readonly<{
  ok: boolean;
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  cycleId?: string;
}>;

export const parseDateOnly = (value: string): Date | null => {
  if (!DATE_ONLY_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const nextCycleStatus = (
  status: CycleStatus,
): CycleStatus | null => {
  if (status === "DRAFT") return "OPEN";
  if (status === "OPEN") return "CLOSED";
  if (status === "CLOSED") return "ARCHIVED";
  return null;
};

const mutationError = (message: string): CycleMutationResult => ({
  ok: false,
  message,
  fieldErrors: {},
});

const formatCycle = (value: Date): string => value.toISOString();

export const getHrCycleManagement = async (
  actor: AuthenticatedActor,
): Promise<HrCycleManagementData | null> => {
  if (!canAdministerHrDomain(actor)) return null;

  const [activePeople, openCycles, activeTemplates, feedbacks, cycles, templates] =
    await prisma.$transaction([
      prisma.person.count({ where: { active: true } }),
      prisma.cycle.count({ where: { status: "OPEN" } }),
      prisma.formTemplate.count({ where: { active: true } }),
      prisma.feedback.count(),
      prisma.cycle.findMany({
        orderBy: [{ startsAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          startsAt: true,
          endsAt: true,
          status: true,
          selfAssessmentEnabled: true,
          _count: { select: { feedbacks: true } },
          cycleTemplates: {
            select: {
              template: {
                select: {
                  id: true,
                  name: true,
                  version: true,
                  _count: { select: { questions: true } },
                },
              },
            },
          },
        },
      }),
      prisma.formTemplate.findMany({
        where: { active: true },
        orderBy: [{ name: "asc" }, { version: "desc" }],
        select: {
          id: true,
          name: true,
          version: true,
          questions: {
            where: { active: true },
            orderBy: { position: "asc" },
            select: {
              id: true,
              prompt: true,
              type: true,
              position: true,
              required: true,
              minimum: true,
              maximum: true,
            },
          },
        },
      }),
    ]);

  return {
    metrics: { activePeople, openCycles, activeTemplates, feedbacks },
    cycles: cycles.map((cycle) => ({
      id: cycle.id,
      name: cycle.name,
      startsAt: formatCycle(cycle.startsAt),
      endsAt: formatCycle(cycle.endsAt),
      status: cycle.status,
      selfAssessmentEnabled: cycle.selfAssessmentEnabled,
      feedbackCount: cycle._count.feedbacks,
      templates: cycle.cycleTemplates.map(({ template }) => ({
        id: template.id,
        name: template.name,
        version: template.version,
        questionCount: template._count.questions,
      })),
    })),
    templates,
  };
};

export const createHrCycle = async (
  actor: AuthenticatedActor,
  input: unknown,
): Promise<CycleMutationResult> => {
  if (!canAdministerHrDomain(actor)) {
    return mutationError("Você não tem permissão para administrar ciclos.");
  }

  const parsed = createCycleInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, message: "Revise os dados do ciclo.", fieldErrors };
  }

  const startsAt = parseDateOnly(parsed.data.startsAt);
  const endsAt = parseDateOnly(parsed.data.endsAt);
  if (!startsAt || !endsAt) return mutationError("Informe datas válidas.");

  const template = await prisma.formTemplate.findFirst({
    where: { id: parsed.data.templateId, active: true },
    select: { id: true, questions: { where: { active: true }, select: { id: true } } },
  });
  if (!template || template.questions.length === 0) {
    return mutationError("Selecione um formulário ativo com competências.");
  }

  const existingCycle = await prisma.cycle.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingCycle) return mutationError("Já existe um ciclo com esse nome.");

  const cycle = await prisma.$transaction(async (transaction) => {
    const created = await transaction.cycle.create({
      data: {
        name: parsed.data.name,
        startsAt,
        endsAt,
        selfAssessmentEnabled: parsed.data.selfAssessmentEnabled,
        status: "DRAFT",
      },
      select: { id: true },
    });
    await transaction.cycleFormTemplate.create({
      data: { cycleId: created.id, templateId: template.id },
    });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: crypto.randomUUID(),
        action: "CREATE",
        entityType: "CYCLE",
        entityId: created.id,
        result: "SUCCESS",
        metadata: { status: "DRAFT", selfAssessmentEnabled: parsed.data.selfAssessmentEnabled },
      },
    });
    return created;
  });

  return {
    ok: true,
    message: "Ciclo criado como rascunho.",
    fieldErrors: {},
    cycleId: cycle.id,
  };
};

export const updateHrCycleStatus = async (
  actor: AuthenticatedActor,
  cycleId: string,
  targetStatus: string,
): Promise<CycleMutationResult> => {
  if (!canAdministerHrDomain(actor)) {
    return mutationError("Você não tem permissão para alterar ciclos.");
  }

  const parsedId = z.string().uuid().safeParse(cycleId);
  const parsedStatus = z.enum(["OPEN", "CLOSED", "ARCHIVED"]).safeParse(targetStatus);
  if (!parsedId.success || !parsedStatus.success) {
    return mutationError("A alteração solicitada é inválida.");
  }

  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      status: true,
      cycleTemplates: {
        select: { template: { select: { active: true, questions: { where: { active: true }, select: { id: true } } } } },
      },
    },
  });
  if (!cycle) return mutationError("Ciclo não encontrado.");

  if (nextCycleStatus(cycle.status) !== parsedStatus.data) {
    return mutationError("A transição de status solicitada não é permitida.");
  }

  if (parsedStatus.data === "OPEN") {
    const hasActiveForm = cycle.cycleTemplates.some(
      ({ template }) => template.active && template.questions.length > 0,
    );
    if (!hasActiveForm) return mutationError("Associe um formulário ativo antes de abrir o ciclo.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.cycle.update({ where: { id: cycle.id }, data: { status: parsedStatus.data } });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: crypto.randomUUID(),
        action: "UPDATE_STATUS",
        entityType: "CYCLE",
        entityId: cycle.id,
        result: "SUCCESS",
        metadata: { from: cycle.status, to: parsedStatus.data },
      },
    });
  });

  return {
    ok: true,
    message: "Status do ciclo atualizado.",
    fieldErrors: {},
    cycleId: cycle.id,
  };
};
