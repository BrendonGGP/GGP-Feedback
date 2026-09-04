import type { Prisma } from "@prisma/client";

import type { AuthenticatedActor } from "@/lib/auth/session";
import { canCreateFeedbackForPerson } from "@/lib/authorization/access-control";
import {
  validateFeedbackAnswers,
  type FeedbackIntent,
} from "@/lib/feedback/feedback-validation";
import { prisma } from "@/lib/prisma";

const isFunctionalActor = (actor: AuthenticatedActor): boolean =>
  !actor.roles.includes("SYSTEM_ADMIN") &&
  actor.roles.some((role) => ["HR_ADMIN", "MANAGER", "EMPLOYEE"].includes(role));

const visibilityWhere = (actor: AuthenticatedActor): Prisma.FeedbackWhereInput => {
  if (actor.roles.includes("HR_ADMIN")) {
    return {};
  }
  if (actor.roles.includes("MANAGER")) {
    return {
      OR: [
        { evaluatorPersonId: actor.personId },
        { subjectPersonId: actor.personId },
      ],
    };
  }
  return { subjectPersonId: actor.personId };
};

export const getFeedbackOverview = async (actor: AuthenticatedActor) => {
  if (!isFunctionalActor(actor)) {
    return null;
  }

  const where = visibilityWhere(actor);
  const [total, drafts, submitted, received, rows, canStart] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: { AND: [where, { status: "DRAFT" }] } }),
    prisma.feedback.count({ where: { AND: [where, { status: "SUBMITTED" }] } }),
    prisma.feedback.count({
      where: {
        AND: [where, { subjectPersonId: actor.personId, status: "SUBMITTED" }],
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
  ]);

  return {
    metrics: { total, drafts, submitted, received },
    canStart: actor.roles.includes("MANAGER") && canStart > 0,
    rows: rows.map((feedback) => ({
      id: feedback.id,
      subjectName:
        feedback.subject.id === actor.personId ? "Você" : feedback.subject.fullName,
      evaluatorName:
        feedback.evaluator.id === actor.personId ? "Você" : feedback.evaluator.fullName,
      companyName: feedback.subject.company.name,
      cycleName: feedback.cycle.name,
      status: feedback.status,
      date: (feedback.submittedAt ?? feedback.createdAt).toISOString(),
    })),
  };
};

export const getNewFeedbackContext = async (actor: AuthenticatedActor) => {
  if (!isFunctionalActor(actor) || !actor.roles.includes("MANAGER")) {
    return null;
  }

  const now = new Date();
  const [cycle, directReports] = await prisma.$transaction([
    prisma.cycle.findFirst({
      where: {
        status: "OPEN",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { endsAt: "asc" },
      select: {
        id: true,
        name: true,
        cycleTemplates: {
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
    }),
    prisma.person.findMany({
      where: { managerId: actor.personId, active: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        managerId: true,
        company: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
  ]);

  const questions = cycle?.cycleTemplates[0]?.template.questions ?? [];
  return {
    cycle: cycle ? { id: cycle.id, name: cycle.name } : null,
    people: directReports.filter((person) => canCreateFeedbackForPerson(actor, {
      personId: person.id,
      managerId: person.managerId,
    })).map((person) => ({
      id: person.id,
      fullName: person.fullName,
      jobTitle: person.jobTitle,
      companyName: person.company.name,
      departmentName: person.department.name,
    })),
    questions,
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
  if (!isFunctionalActor(actor) || !actor.roles.includes("MANAGER")) {
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
            cycleTemplates: {
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
        !canCreateFeedbackForPerson(actor, {
          personId: subject?.id ?? "",
          managerId: subject?.managerId ?? null,
        }) ||
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
          metadata: { answerCount: validation.answers.length, status },
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
