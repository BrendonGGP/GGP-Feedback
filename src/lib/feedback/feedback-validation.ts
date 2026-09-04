export type FeedbackQuestion = Readonly<{
  id: string;
  type: "RATING" | "LONG_TEXT" | "SHORT_TEXT";
  required: boolean;
  minimum: number | null;
  maximum: number | null;
}>;

export type FeedbackIntent = "draft" | "submit";

export type NormalizedFeedbackAnswer = Readonly<{
  questionId: string;
  rating: number | null;
  text: string | null;
}>;

export type FeedbackValidationResult =
  | Readonly<{ ok: true; answers: readonly NormalizedFeedbackAnswer[] }>
  | Readonly<{
      ok: false;
      message: string;
      fieldErrors: Readonly<Record<string, string>>;
    }>;

const MAX_TEXT_LENGTH = 4000;

export const validateFeedbackAnswers = (
  questions: readonly FeedbackQuestion[],
  rawAnswers: Readonly<Record<string, string>>,
  intent: FeedbackIntent,
): FeedbackValidationResult => {
  const questionIds = new Set(questions.map(({ id }) => id));
  if (Object.keys(rawAnswers).some((questionId) => !questionIds.has(questionId))) {
    return {
      ok: false,
      message: "O formulário enviado não corresponde ao ciclo selecionado.",
      fieldErrors: {},
    };
  }

  const fieldErrors: Record<string, string> = {};
  const answers: NormalizedFeedbackAnswer[] = [];

  for (const question of questions) {
    const value = rawAnswers[question.id]?.trim() ?? "";
    if (!value) {
      if (intent === "submit" && question.required) {
        fieldErrors[question.id] = "Preencha este campo antes de concluir.";
      }
      continue;
    }

    if (question.type === "RATING") {
      const rating = Number(value);
      const minimum = question.minimum ?? 1;
      const maximum = question.maximum ?? 5;
      if (!Number.isInteger(rating) || rating < minimum || rating > maximum) {
        fieldErrors[question.id] = `Escolha uma nota entre ${minimum} e ${maximum}.`;
        continue;
      }
      answers.push({ questionId: question.id, rating, text: null });
      continue;
    }

    if (value.length > MAX_TEXT_LENGTH) {
      fieldErrors[question.id] = `Use no máximo ${MAX_TEXT_LENGTH} caracteres.`;
      continue;
    }
    answers.push({ questionId: question.id, rating: null, text: value });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Revise os campos destacados para continuar.",
      fieldErrors,
    };
  }

  return { ok: true, answers };
};
