import { Prisma, type FormAudience, type QuestionType } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { withDatabaseActor } from "@/lib/infrastructure/database/actor-context";

const ratingBoundSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z.number().int().min(1).max(5).nullable(),
);

const questionInputSchema = z
  .object({
    prompt: z.string().trim().min(3, "Escreva o enunciado da pergunta.").max(1000),
    type: z.enum(["RATING", "LONG_TEXT", "SHORT_TEXT"]),
    required: z.preprocess(
      (value) => (typeof value === "string" ? value === "true" || value === "on" : value),
      z.boolean(),
    ),
    minimum: ratingBoundSchema,
    maximum: ratingBoundSchema,
  })
  .superRefine((value, context) => {
    if (value.type !== "RATING") {
      if (value.minimum !== null || value.maximum !== null) {
        context.addIssue({
          code: "custom",
          path: ["minimum"],
          message: "Perguntas de texto não usam escala de notas.",
        });
      }
      return;
    }

    if (value.minimum === null || value.maximum === null) {
      context.addIssue({
        code: "custom",
        path: ["minimum"],
        message: "Defina os limites da escala de notas.",
      });
      return;
    }

    if (value.minimum >= value.maximum) {
      context.addIssue({
        code: "custom",
        path: ["maximum"],
        message: "O limite máximo deve ser maior que o mínimo.",
      });
    }
  });

const questionsInputSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  },
  z.array(questionInputSchema).min(1, "Adicione pelo menos uma pergunta.").max(30, "O formulário pode ter no máximo 30 perguntas."),
);

export const formTemplateInputSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome para o formulário.").max(160),
  audience: z.enum(["MANAGER", "EMPLOYEE", "BOTH"]),
  questions: questionsInputSchema,
});

export type FormTemplateInput = z.infer<typeof formTemplateInputSchema>;

export type HrFormTemplate = Readonly<{
  id: string;
  name: string;
  version: number;
  audience: FormAudience;
  questions: readonly {
    id: string;
    prompt: string;
    type: QuestionType;
    position: number;
    required: boolean;
    minimum: number | null;
    maximum: number | null;
  }[];
}>;

export type FormMutationResult = Readonly<{
  ok: boolean;
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  templateId?: string;
}>;

const mutationError = (
  message: string,
  fieldErrors: Readonly<Record<string, string>> = {},
): FormMutationResult => ({
  ok: false,
  message,
  fieldErrors,
});

const parseInput = (input: unknown):
  | { success: true; data: FormTemplateInput }
  | { success: false; result: FormMutationResult } => {
  const parsed = formTemplateInputSchema.safeParse(input);
  if (parsed.success) return parsed;

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] === "questions" ? "questions" : String(issue.path[0] ?? "form");
    fieldErrors[field] ??= issue.message;
  }

  return {
    success: false,
    result: mutationError("Revise os dados do formulário.", fieldErrors),
  };
};

export const parseFormTemplateInput = (input: unknown) => formTemplateInputSchema.safeParse(input);

const questionData = (questions: FormTemplateInput["questions"]) =>
  questions.map((question, index) => ({
    id: crypto.randomUUID(),
    prompt: question.prompt,
    type: question.type,
    position: index + 1,
    required: question.required,
    minimum: question.type === "RATING" ? question.minimum : null,
    maximum: question.type === "RATING" ? question.maximum : null,
    active: true,
  }));

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export const createHrFormTemplate = async (
  actor: AuthenticatedActor,
  input: unknown,
): Promise<FormMutationResult> => {
  if (!canAdministerHrDomain(actor)) {
    return mutationError("Você não tem permissão para administrar formulários.");
  }

  const parsed = parseInput(input);
  if (!parsed.success) return parsed.result;

  return withDatabaseActor(actor, async (transaction) => {
    try {
      const latest = await transaction.formTemplate.findFirst({
        where: { name: { equals: parsed.data.name, mode: "insensitive" } },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (latest?.version ?? 0) + 1;
      const template = await transaction.formTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name: parsed.data.name,
          version,
          audience: parsed.data.audience,
          active: true,
          questions: { create: questionData(parsed.data.questions) },
        },
        select: { id: true },
      });

      await transaction.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          requestId: crypto.randomUUID(),
          action: "CREATE_FORM_TEMPLATE",
          entityType: "FORM_TEMPLATE",
          entityId: template.id,
          result: "SUCCESS",
          metadata: {
            version,
            audience: parsed.data.audience,
            questionCount: parsed.data.questions.length,
          },
        },
      });

      return {
        ok: true,
        message: "Formulário criado como nova versão ativa.",
        fieldErrors: {},
        templateId: template.id,
      };
    } catch (error) {
      if (isUniqueViolation(error)) return mutationError("Já existe uma versão compatível desse formulário.");
      throw error;
    }
  });
};

export const updateHrFormTemplate = async (
  actor: AuthenticatedActor,
  templateId: string,
  input: unknown,
): Promise<FormMutationResult> => {
  if (!canAdministerHrDomain(actor)) {
    return mutationError("Você não tem permissão para administrar formulários.");
  }

  const parsedId = z.string().uuid().safeParse(templateId);
  if (!parsedId.success) return mutationError("O formulário informado é inválido.");

  const parsed = parseInput(input);
  if (!parsed.success) return parsed.result;

  return withDatabaseActor(actor, async (transaction) => {
    try {
      const current = await transaction.formTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, name: true, version: true },
      });
      if (!current) return mutationError("Formulário não encontrado.");

      const latest = await transaction.formTemplate.findFirst({
        where: { name: { equals: parsed.data.name, mode: "insensitive" } },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = Math.max(current.version, latest?.version ?? 0) + 1;
      const template = await transaction.formTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name: parsed.data.name,
          version,
          audience: parsed.data.audience,
          active: true,
          questions: { create: questionData(parsed.data.questions) },
        },
        select: { id: true },
      });

      await transaction.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          requestId: crypto.randomUUID(),
          action: "UPDATE_FORM_TEMPLATE",
          entityType: "FORM_TEMPLATE",
          entityId: template.id,
          result: "SUCCESS",
          metadata: {
            previousTemplateId: current.id,
            previousVersion: current.version,
            version,
            audience: parsed.data.audience,
            questionCount: parsed.data.questions.length,
          },
        },
      });

      return {
        ok: true,
        message: "Formulário atualizado. Uma nova versão foi criada para preservar o histórico.",
        fieldErrors: {},
        templateId: template.id,
      };
    } catch (error) {
      if (isUniqueViolation(error)) return mutationError("Já existe uma versão compatível desse formulário.");
      throw error;
    }
  });
};

/**
 * Removes a form from the active library without destroying its history.
 *
 * Existing cycles keep their template relation and answers. New cycles only
 * offer active templates, so this is the safe deletion behavior for a form
 * that may already have been used.
 */
export const deleteHrFormTemplate = async (
  actor: AuthenticatedActor,
  templateId: string,
): Promise<FormMutationResult> => {
  if (!canAdministerHrDomain(actor)) {
    return mutationError("Você não tem permissão para administrar formulários.");
  }

  const parsedId = z.string().uuid().safeParse(templateId);
  if (!parsedId.success) return mutationError("O formulário informado é inválido.");

  return withDatabaseActor(actor, async (transaction) => {
    const current = await transaction.formTemplate.findUnique({
      where: { id: parsedId.data },
      select: { id: true, name: true, active: true },
    });

    if (!current) return mutationError("Formulário não encontrado.");
    if (!current.active) {
      return {
        ok: true,
        message: "Formulário já está excluído.",
        fieldErrors: {},
        templateId: current.id,
      };
    }

    await transaction.formTemplate.update({
      where: { id: current.id },
      data: { active: false },
      select: { id: true },
    });

    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: crypto.randomUUID(),
        action: "ARCHIVE_FORM_TEMPLATE",
        entityType: "FORM_TEMPLATE",
        entityId: current.id,
        result: "SUCCESS",
        metadata: { name: current.name },
      },
    });

    return {
      ok: true,
      message: "Formulário excluído da biblioteca. Histórico e ciclos existentes foram preservados.",
      fieldErrors: {},
      templateId: current.id,
    };
  });
};
