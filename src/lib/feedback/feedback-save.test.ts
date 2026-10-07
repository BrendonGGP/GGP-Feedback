import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    person: { findUnique: vi.fn() },
    cycle: { findFirst: vi.fn() },
    feedback: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    feedbackAnswer: { upsert: vi.fn() },
    auditEvent: { createMany: vi.fn() },
  };
  return { transaction };
});

vi.mock("@/lib/infrastructure/database/actor-context", () => ({
  withDatabaseActor: async (_actor: unknown, operation: () => Promise<unknown>) => operation(),
}));

vi.mock("@/lib/infrastructure/database/prisma", () => ({
  runtimePrisma: {
    $transaction: async (callback: (tx: typeof mocks.transaction) => Promise<unknown>) =>
      callback(mocks.transaction),
  },
}));

import { saveFeedback } from "./feedback-service";

const manager = {
  accountId: "10000000-0000-4000-8000-000000000001",
  personId: "10000000-0000-4000-8000-000000000002",
  roles: ["MANAGER", "EMPLOYEE"] as const,
  mustChangePassword: false,
};
const subjectId = "10000000-0000-4000-8000-000000000003";
const cycleId = "10000000-0000-4000-8000-000000000004";
const questionId = "10000000-0000-4000-8000-000000000005";

const callOrder = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder;

describe("saveFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { transaction } = mocks;
    transaction.person.findUnique.mockResolvedValue({
      id: subjectId,
      managerId: manager.personId,
      active: true,
    });
    transaction.cycle.findFirst.mockResolvedValue({
      selfAssessmentEnabled: false,
      cycleTemplates: [
        {
          template: {
            audience: "BOTH",
            questions: [{ id: questionId, type: "RATING", required: true, minimum: 1, maximum: 5 }],
          },
        },
      ],
    });
    transaction.feedback.findUnique.mockResolvedValue(null);
    transaction.feedback.create.mockResolvedValue({ id: "feedback-1" });
    transaction.feedback.updateMany.mockResolvedValue({ count: 1 });
  });

  it("grava as respostas com o feedback em rascunho e só depois o envia", async () => {
    const { transaction } = mocks;

    const result = await saveFeedback(manager, {
      cycleId,
      subjectPersonId: subjectId,
      intent: "submit",
      rawAnswers: { [questionId]: "4" },
    });

    expect(result).toEqual({ ok: true, feedbackId: "feedback-1", status: "SUBMITTED" });
    expect(transaction.feedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT", submittedAt: null }),
      }),
    );
    expect(transaction.feedback.updateMany).toHaveBeenCalledWith({
      where: { id: "feedback-1", status: "DRAFT" },
      data: { status: "SUBMITTED", submittedAt: expect.any(Date) },
    });

    const [answerWrite] = callOrder(transaction.feedbackAnswer.upsert);
    const [submission] = callOrder(transaction.feedback.updateMany);
    expect(answerWrite).toBeLessThan(submission);
    expect(transaction.auditEvent.createMany).toHaveBeenCalledOnce();
  });

  it("salva o rascunho sem marcar envio", async () => {
    const result = await saveFeedback(manager, {
      cycleId,
      subjectPersonId: subjectId,
      intent: "draft",
      rawAnswers: { [questionId]: "4" },
    });

    expect(result).toEqual({ ok: true, feedbackId: "feedback-1", status: "DRAFT" });
    expect(mocks.transaction.feedback.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.feedbackAnswer.upsert).toHaveBeenCalledOnce();
  });
});
