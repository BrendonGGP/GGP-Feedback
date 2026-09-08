import type { Prisma } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import {
  canCreateFeedbackForPerson,
  canCreateSelfAssessment,
  canAdministerHrDomain,
  resolveFeedbackReadScope,
} from "@/lib/authorization/access-control";
import {
  validateFeedbackAnswers,
  type FeedbackIntent,
} from "@/lib/feedback/feedback-validation";
import { prisma } from "@/lib/prisma";
import { serializeCsv } from "@/lib/feedback/csv";

const MAX_EXPORT_ROWS = 5000;
const MAX_ANALYTICS_FEEDBACKS = 5000;

const isFunctionalActor = (actor: AuthenticatedActor): boolean =>
  !actor.roles.includes("SYSTEM_ADMIN") &&
  actor.roles.some((role) => ["HR_ADMIN", "MANAGER", "EMPLOYEE"].includes(role));

const visibilityWhere = (actor: AuthenticatedActor): Prisma.FeedbackWhereInput => {
  const scope = resolveFeedbackReadScope(actor);
  if (scope === "ALL") return {};
  if (scope === "SELF_AND_AUTHORED") {
    return {
      OR: [
        { evaluatorPersonId: actor.personId },
        { subjectPersonId: actor.personId },
      ],
    };
  }
  if (scope === "SELF") return { subjectPersonId: actor.personId };
  return { id: "00000000-0000-0000-0000-000000000000" };
};

export const getFeedbackOverview = async (actor: AuthenticatedActor) => {
  if (!isFunctionalActor(actor)) {
    return null;
  }

  const where = visibilityWhere(actor);
  const now = new Date();
  const [
    total,
    drafts,
    submitted,
    received,
    rows,
    directReportCount,
    openCycleCount,
    selfAssessmentCycleCount,
    activeSelfCount,
  ] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: { AND: [where, { status: "DRAFT" }] } }),
    prisma.feedback.count({ where: { AND: [where, { status: "SUBMITTED" }] } }),
    prisma.feedback.count({
      where: {
        AND: [
          where,
          {
            subjectPersonId: actor.personId,
            evaluatorPersonId: { not: actor.personId },
            status: "SUBMITTED",
          },
        ],
      },
    }),
    prisma.feedback.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        cycle: { select: { name: true } },
        subject: {
          select: { id: true, fullName: true, company: { select: { name: true } } },
        },
        evaluator: { select: { id: true, fullName: true } },
      },
    }),
    prisma.person.count({ where: { managerId: actor.personId, active: true } }),
    prisma.cycle.count({
      where: {
        status: "OPEN",
        startsAt: { lte: now },
        endsAt: { gte: now },
        cycleTemplates: {
          some: {
            template: { active: true, questions: { some: { active: true } } },
          },
        },
      },
    }),
    prisma.cycle.count({
      where: {
        status: "OPEN",
        startsAt: { lte: now },
        endsAt: { gte: now },
        selfAssessmentEnabled: true,
        cycleTemplates: {
          some: {
            template: { active: true, questions: { some: { active: true } } },
          },
        },
      },
    }),
    prisma.person.count({ where: { id: actor.personId, active: true } }),
  ]);

  return {
    metrics: { total, drafts, submitted, received },
    canStart:
      (actor.roles.includes("MANAGER") && directReportCount > 0 && openCycleCount > 0) ||
      (actor.roles.includes("EMPLOYEE") && activeSelfCount > 0 && selfAssessmentCycleCount > 0),
    rows: rows.map((feedback) => ({
      id: feedback.id,
      subjectName:
        feedback.subject.id === actor.personId ? "Você" : feedback.subject.fullName,
      evaluatorName:
        feedback.evaluator.id === actor.personId ? "Você" : feedback.evaluator.fullName,
      assessmentType:
        feedback.subject.id === feedback.evaluator.id ? "SELF" as const : "MANAGER" as const,
      companyName: feedback.subject.company.name,
      cycleName: feedback.cycle.name,
      status: feedback.status,
      date: (feedback.submittedAt ?? feedback.createdAt).toISOString(),
    })),
  };
};

type AnalyticsAccumulator = {
  name: string;
  count: number;
  total: number;
  ratings: number;
};

const average = (total: number, count: number): number =>
  count === 0 ? 0 : Math.round((total / count) * 10) / 10;

const promptTitle = (prompt: string): string =>
  prompt.split(/\s+[-—]\s+/)[0]?.trim() || prompt;

export const getFeedbackAnalytics = async (actor: AuthenticatedActor) => {
  if (!isFunctionalActor(actor)) return null;

  const feedbacks = await prisma.feedback.findMany({
    where: { AND: [visibilityWhere(actor), { status: "SUBMITTED" }] },
    orderBy: { submittedAt: "desc" },
    take: MAX_ANALYTICS_FEEDBACKS,
    select: {
      cycle: { select: { id: true, name: true } },
      answers: {
        where: { question: { type: "RATING" }, rating: { not: null } },
        select: {
          rating: true,
          question: { select: { id: true, prompt: true } },
        },
      },
    },
  });

  const cycles = new Map<string, AnalyticsAccumulator>();
  const competencies = new Map<string, AnalyticsAccumulator>();
  let total = 0;
  let ratings = 0;

  for (const feedback of feedbacks) {
    const cycle = cycles.get(feedback.cycle.id) ?? {
      name: feedback.cycle.name,
      count: 0,
      total: 0,
      ratings: 0,
    };
    cycle.count += 1;

    for (const answer of feedback.answers) {
      if (answer.rating === null) continue;
      const competency = competencies.get(answer.question.id) ?? {
        name: promptTitle(answer.question.prompt),
        count: 0,
        total: 0,
        ratings: 0,
      };
      competency.count += 1;
      competency.total += answer.rating;
      competency.ratings += 1;
      cycle.total += answer.rating;
      cycle.ratings += 1;
      total += answer.rating;
      ratings += 1;
    }

    cycles.set(feedback.cycle.id, cycle);
  }

  return {
    totalFeedbacks: feedbacks.length,
    limited: feedbacks.length === MAX_ANALYTICS_FEEDBACKS,
    average: average(total, ratings),
    cycleCount: cycles.size,
    cycles: [...cycles.values()].map((cycle) => ({
      name: cycle.name,
      count: cycle.count,
      average: average(cycle.total, cycle.ratings),
    })),
    competencies: [...competencies.values()]
      .sort((left, right) => average(right.total, right.ratings) - average(left.total, left.ratings))
      .map((competency) => ({
        name: competency.name,
        count: competency.count,
        average: average(competency.total, competency.ratings),
      })),
  };
};

export type FeedbackExportResult =
  | Readonly<{ ok: true; csv: string }>
  | Readonly<{ ok: false; status: 403 | 422; message: string }>;

export const getFeedbackExportCsv = async (
  actor: AuthenticatedActor,
): Promise<FeedbackExportResult> => {
  if (!canAdministerHrDomain(actor)) {
    return { ok: false, status: 403, message: "Exportação não autorizada." };
  }

  const where = visibilityWhere(actor);
  try {
    return await prisma.$transaction(async (transaction) => {
      const total = await transaction.feedback.count({ where });
      if (total > MAX_EXPORT_ROWS) {
        return {
          ok: false as const,
          status: 422 as const,
          message: "A exportação excede o limite permitido. Aplique filtros e tente novamente.",
        };
      }

      const feedbacks = await transaction.feedback.findMany({
        where,
        orderBy: [{ cycle: { endsAt: "desc" } }, { createdAt: "desc" }],
        select: {
          status: true,
          createdAt: true,
          submittedAt: true,
          cycle: { select: { name: true } },
          subject: {
            select: {
              id: true,
              fullName: true,
              company: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
          evaluator: { select: { id: true, fullName: true } },
          answers: {
            orderBy: { question: { position: "asc" } },
            select: {
              rating: true,
              text: true,
              question: { select: { prompt: true } },
            },
          },
        },
      });

      const csv = serializeCsv(
        [
          "Avaliado",
          "Avaliador",
          "Empresa",
          "Departamento",
          "Ciclo",
          "Tipo",
          "Status",
          "Data",
          "Respostas",
        ],
        feedbacks.map((feedback) => [
          feedback.subject.fullName,
          feedback.evaluator.fullName,
          feedback.subject.company.name,
          feedback.subject.department.name,
          feedback.cycle.name,
          feedback.subject.id === feedback.evaluator.id ? "Autoavaliação" : "Feedback",
          feedback.status === "DRAFT" ? "Rascunho" : "Enviado",
          (feedback.submittedAt ?? feedback.createdAt).toISOString(),
          feedback.answers
            .map((answer) => `${answer.question.prompt}: ${answer.rating ?? answer.text ?? ""}`)
            .join("\n"),
        ]),
      );

      await transaction.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          requestId: crypto.randomUUID(),
          action: "EXPORT_FEEDBACK_CSV",
          entityType: "Feedback",
          entityId: null,
          result: "SUCCESS",
          metadata: { rowCount: feedbacks.length, scope: "HR_ADMIN" },
        },
      });

      return { ok: true as const, csv };
    });
  } catch {
    return { ok: false, status: 422, message: "Não foi possível gerar a exportação." };
  }
};

export const getNewFeedbackContext = async (
  actor: AuthenticatedActor,
  draftId?: string,
) => {
  const canEvaluateDirectReports = actor.roles.includes("MANAGER");
  const canAssessSelf = actor.roles.includes("EMPLOYEE");
  if (!isFunctionalActor(actor) || (!canEvaluateDirectReports && !canAssessSelf)) {
    return null;
  }

  const now = new Date();
  const parsedDraftId = z.string().uuid().safeParse(draftId);
  const [cycles, directReports, self, draft] = await prisma.$transaction(async (transaction) => {
    const cycles = await transaction.cycle.findMany({
      where: {
        status: "OPEN",
        startsAt: { lte: now },
        endsAt: { gte: now },
        cycleTemplates: {
          some: {
            template: { active: true, questions: { some: { active: true } } },
          },
        },
      },
      orderBy: { endsAt: "asc" },
      select: {
        id: true,
        name: true,
        selfAssessmentEnabled: true,
        cycleTemplates: {
          where: { template: { active: true } },
          take: 1,
          select: {
            template: {
              select: {
                questions: {
                  where: { active: true },
                  orderBy: { position: "asc" },
                  select: {
                    id: true,
                    prompt: true,
                    type: true,
                    required: true,
                    minimum: true,
                    maximum: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const personSelection = {
      id: true,
      fullName: true,
      jobTitle: true,
      managerId: true,
      company: { select: { name: true } },
      department: { select: { name: true } },
    } satisfies Prisma.PersonSelect;
    const directReports = canEvaluateDirectReports
      ? await transaction.person.findMany({
          where: { managerId: actor.personId, active: true },
          orderBy: { fullName: "asc" },
          select: personSelection,
        })
      : [];
    const self = canAssessSelf
      ? await transaction.person.findFirst({
          where: { id: actor.personId, active: true },
          select: personSelection,
        })
      : null;
    const draft = parsedDraftId.success
      ? await transaction.feedback.findFirst({
          where: {
            id: draftId,
            status: "DRAFT",
            evaluatorPersonId: actor.personId,
          },
          select: {
            cycleId: true,
            subjectPersonId: true,
            subject: { select: { managerId: true } },
            answers: { select: { questionId: true, rating: true, text: true } },
          },
        })
      : null;
    return [cycles, directReports, self, draft] as const;
  });

  const eligibleCycles = cycles.filter(
    (cycle) =>
      (cycle.cycleTemplates[0]?.template.questions.length ?? 0) > 0 &&
      (directReports.length > 0 || Boolean(self && cycle.selfAssessmentEnabled)),
  );
  const cycle = draft
    ? eligibleCycles.find((candidate) => candidate.id === draft.cycleId) ?? null
    : eligibleCycles[0] ?? null;
  const questions = cycle?.cycleTemplates[0]?.template.questions ?? [];
  const draftMatchesCurrentCycle = Boolean(draft && cycle);
  const draftIsAuthorized = Boolean(
    draftMatchesCurrentCycle &&
      draft &&
      (
        canCreateFeedbackForPerson(actor, {
          personId: draft.subjectPersonId,
          managerId: draft.subject.managerId,
        }) ||
        canCreateSelfAssessment(actor, {
          subjectPersonId: draft.subjectPersonId,
          selfAssessmentEnabled: cycle?.selfAssessmentEnabled ?? false,
        })
      ),
  );
  const people: Array<{
    id: string;
    fullName: string;
    jobTitle: string;
    companyName: string;
    departmentName: string;
    assessmentType: "SELF" | "MANAGER";
  }> = directReports
    .filter((person) => canCreateFeedbackForPerson(actor, {
      personId: person.id,
      managerId: person.managerId,
    }))
    .map((person) => ({
      id: person.id,
      fullName: person.fullName,
      jobTitle: person.jobTitle,
      companyName: person.company.name,
      departmentName: person.department.name,
      assessmentType: "MANAGER" as const,
    }));
  if (
    self &&
    cycle &&
    canCreateSelfAssessment(actor, {
      subjectPersonId: self.id,
      selfAssessmentEnabled: cycle.selfAssessmentEnabled,
    })
  ) {
    people.unshift({
      id: self.id,
      fullName: self.fullName,
      jobTitle: self.jobTitle,
      companyName: self.company.name,
      departmentName: self.department.name,
      assessmentType: "SELF",
    });
  }

  return {
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, selfAssessmentEnabled: cycle.selfAssessmentEnabled }
      : null,
    people,
    questions,
    draft: draftIsAuthorized && draft
      ? { subjectPersonId: draft.subjectPersonId, answers: draft.answers }
      : null,
  };
};

export const getFeedbackDetail = async (
  actor: AuthenticatedActor,
  feedbackId: string,
) => {
  if (!isFunctionalActor(actor) || !z.string().uuid().safeParse(feedbackId).success) {
    return null;
  }

  const feedback = await prisma.feedback.findFirst({
    where: { AND: [{ id: feedbackId }, visibilityWhere(actor)] },
    select: {
      id: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      cycle: {
        select: {
          name: true,
          status: true,
          startsAt: true,
          endsAt: true,
          selfAssessmentEnabled: true,
        },
      },
      subject: {
        select: {
          id: true,
          fullName: true,
          jobTitle: true,
          managerId: true,
          company: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
      evaluator: { select: { id: true, fullName: true } },
      answers: {
        orderBy: { question: { position: "asc" } },
        select: {
          rating: true,
          text: true,
          question: { select: { id: true, prompt: true, type: true } },
        },
      },
    },
  });

  if (!feedback) return null;

  const now = new Date();
  const cycleIsOpen =
    feedback.cycle.status === "OPEN" &&
    feedback.cycle.startsAt <= now &&
    feedback.cycle.endsAt >= now;
  const canEdit =
    feedback.status === "DRAFT" &&
    cycleIsOpen &&
    feedback.evaluator.id === actor.personId &&
    (
      canCreateFeedbackForPerson(actor, {
        personId: feedback.subject.id,
        managerId: feedback.subject.managerId,
      }) ||
      canCreateSelfAssessment(actor, {
        subjectPersonId: feedback.subject.id,
        selfAssessmentEnabled: feedback.cycle.selfAssessmentEnabled,
      })
    );

  return {
    id: feedback.id,
    status: feedback.status,
    createdAt: feedback.createdAt.toISOString(),
    submittedAt: feedback.submittedAt?.toISOString() ?? null,
    cycleName: feedback.cycle.name,
    subject: {
      id: feedback.subject.id,
      fullName: feedback.subject.fullName,
      jobTitle: feedback.subject.jobTitle,
      companyName: feedback.subject.company.name,
      departmentName: feedback.subject.department.name,
    },
    evaluatorName: feedback.evaluator.id === actor.personId ? "Você" : feedback.evaluator.fullName,
    assessmentType:
      feedback.subject.id === feedback.evaluator.id ? "SELF" as const : "MANAGER" as const,
    canEdit,
    answers: feedback.answers.map((answer) => ({
      questionId: answer.question.id,
      prompt: answer.question.prompt,
      type: answer.question.type,
      rating: answer.rating,
      text: answer.text,
    })),
  };
};

export type SaveFeedbackInput = Readonly<{
  cycleId: string;
  subjectPersonId: string;
  intent: FeedbackIntent;
  rawAnswers: Readonly<Record<string, string>>;
}>;

export type SaveFeedbackResult =
  | Readonly<{ ok: true; feedbackId: string; status: "DRAFT" | "SUBMITTED" }>
  | Readonly<{
      ok: false;
      message: string;
      fieldErrors: Readonly<Record<string, string>>;
    }>;

export const saveFeedback = async (
  actor: AuthenticatedActor,
  input: SaveFeedbackInput,
): Promise<SaveFeedbackResult> => {
  if (!isFunctionalActor(actor)) {
    return { ok: false, message: "Não foi possível salvar este feedback.", fieldErrors: {} };
  }

  const now = new Date();
  try {
    return await prisma.$transaction(async (transaction) => {
      const [subject, cycle] = await Promise.all([
        transaction.person.findUnique({
          where: { id: input.subjectPersonId },
          select: { id: true, managerId: true, active: true },
        }),
        transaction.cycle.findFirst({
          where: {
            id: input.cycleId,
            status: "OPEN",
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
          select: {
            selfAssessmentEnabled: true,
            cycleTemplates: {
              where: { template: { active: true } },
              take: 1,
              select: {
                template: {
                  select: {
                    questions: {
                      where: { active: true },
                      orderBy: { position: "asc" },
                      select: {
                        id: true,
                        type: true,
                        required: true,
                        minimum: true,
                        maximum: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      if (
        !subject?.active ||
        !(
          canCreateFeedbackForPerson(actor, {
            personId: subject?.id ?? "",
            managerId: subject?.managerId ?? null,
          }) ||
          canCreateSelfAssessment(actor, {
            subjectPersonId: subject?.id ?? "",
            selfAssessmentEnabled: cycle?.selfAssessmentEnabled ?? false,
          })
        ) ||
        !cycle
      ) {
        return { ok: false as const, message: "Não foi possível salvar este feedback.", fieldErrors: {} };
      }

      const questions = cycle.cycleTemplates[0]?.template.questions ?? [];
      if (questions.length === 0) {
        return { ok: false as const, message: "O ciclo ainda não possui um formulário ativo.", fieldErrors: {} };
      }

      const validation = validateFeedbackAnswers(questions, input.rawAnswers, input.intent);
      if (!validation.ok) {
        return validation;
      }

      const existing = await transaction.feedback.findUnique({
        where: {
          cycleId_subjectPersonId_evaluatorPersonId: {
            cycleId: input.cycleId,
            subjectPersonId: input.subjectPersonId,
            evaluatorPersonId: actor.personId,
          },
        },
        select: { id: true, status: true, version: true },
      });

      if (existing?.status === "SUBMITTED") {
        throw new Error("IMMUTABLE_FEEDBACK");
      }

      const status = input.intent === "submit" ? "SUBMITTED" : "DRAFT";
      let feedbackId: string;
      if (existing) {
        const updated = await transaction.feedback.updateMany({
          where: { id: existing.id, status: "DRAFT", version: existing.version },
          data: {
            status,
            submittedAt: status === "SUBMITTED" ? now : null,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new Error("CONCURRENT_FEEDBACK_UPDATE");
        }
        feedbackId = existing.id;
      } else {
        const created = await transaction.feedback.create({
          data: {
            cycleId: input.cycleId,
            subjectPersonId: input.subjectPersonId,
            evaluatorPersonId: actor.personId,
            status,
            submittedAt: status === "SUBMITTED" ? now : null,
          },
          select: { id: true },
        });
        feedbackId = created.id;
      }

      for (const answer of validation.answers) {
        await transaction.feedbackAnswer.upsert({
          where: {
            feedbackId_questionId: {
              feedbackId,
              questionId: answer.questionId,
            },
          },
          create: { feedbackId, ...answer },
          update: { rating: answer.rating, text: answer.text },
        });
      }

      await transaction.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          requestId: crypto.randomUUID(),
          action: status === "SUBMITTED" ? "feedback.submitted" : "feedback.draft_saved",
          entityType: "Feedback",
          entityId: feedbackId,
          result: "SUCCESS",
          metadata: {
            answerCount: validation.answers.length,
            status,
            assessmentType: subject.id === actor.personId ? "SELF" : "MANAGER",
          },
        },
      });

      return { ok: true as const, feedbackId, status };
    }, { isolationLevel: "Serializable" });
  } catch {
    return {
      ok: false,
      message: "Não foi possível salvar. Atualize a página e tente novamente.",
      fieldErrors: {},
    };
  }
};
