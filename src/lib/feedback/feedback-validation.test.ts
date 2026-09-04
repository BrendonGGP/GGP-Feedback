import { describe, expect, it } from "vitest";

import { validateFeedbackAnswers, type FeedbackQuestion } from "./feedback-validation";

const questions: readonly FeedbackQuestion[] = [
  { id: "rating", type: "RATING", required: true, minimum: 1, maximum: 5 },
  { id: "comment", type: "LONG_TEXT", required: true, minimum: null, maximum: null },
];

describe("validação das respostas de feedback", () => {
  it("permite rascunho parcial", () => {
    expect(validateFeedbackAnswers(questions, { rating: "3" }, "draft")).toEqual({
      ok: true,
      answers: [{ questionId: "rating", rating: 3, text: null }],
    });
  });

  it("exige respostas obrigatórias na conclusão", () => {
    const result = validateFeedbackAnswers(questions, { rating: "3" }, "submit");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.comment).toBeDefined();
    }
  });

  it("rejeita nota fora da escala e pergunta adulterada", () => {
    expect(validateFeedbackAnswers(questions, { rating: "6" }, "draft").ok).toBe(false);
    expect(validateFeedbackAnswers(questions, { unknown: "texto" }, "draft").ok).toBe(false);
  });
});
