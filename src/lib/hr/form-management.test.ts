import { describe, expect, it } from "vitest";

import { parseFormTemplateInput } from "./form-management";

const validInput = {
  name: "Feedback de desempenho",
  audience: "BOTH",
  questions: [
    {
      prompt: "Demonstra autonomia nas entregas.",
      type: "RATING",
      required: true,
      minimum: 1,
      maximum: 5,
    },
    {
      prompt: "Registre evidências observáveis.",
      type: "LONG_TEXT",
      required: false,
      minimum: null,
      maximum: null,
    },
  ],
};

describe("regras de formulários do RH", () => {
  it("aceita um formulário para ambos os perfis", () => {
    const result = parseFormTemplateInput(validInput);

    expect(result.success).toBe(true);
  });

  it("aceita o JSON usado pelo formulário da interface", () => {
    const result = parseFormTemplateInput({
      ...validInput,
      questions: JSON.stringify(validInput.questions),
    });

    expect(result.success).toBe(true);
  });

  it("rejeita escala sem limite ou com intervalo invertido", () => {
    expect(parseFormTemplateInput({
      ...validInput,
      questions: [{ ...validInput.questions[0], minimum: null }],
    }).success).toBe(false);

    expect(parseFormTemplateInput({
      ...validInput,
      questions: [{ ...validInput.questions[0], minimum: 5, maximum: 1 }],
    }).success).toBe(false);
  });

  it("rejeita perguntas de texto com limites de nota", () => {
    expect(parseFormTemplateInput({
      ...validInput,
      questions: [{ ...validInput.questions[1], minimum: 1, maximum: 5 }],
    }).success).toBe(false);
  });

  it("exige pelo menos uma pergunta", () => {
    expect(parseFormTemplateInput({ ...validInput, questions: [] }).success).toBe(false);
  });
});
