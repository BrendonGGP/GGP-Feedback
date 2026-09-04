"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuthenticatedActor } from "@/lib/auth/session";
import { saveFeedback } from "@/lib/feedback/feedback-service";

export type FeedbackActionState = Readonly<{
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
}>;

const requestSchema = z.object({
  cycleId: z.string().uuid(),
  subjectPersonId: z.string().uuid(),
  intent: z.enum(["draft", "submit"]),
});

export async function saveFeedbackAction(
  _previousState: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsed = requestSchema.safeParse({
    cycleId: formData.get("cycleId"),
    subjectPersonId: formData.get("subjectPersonId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    return { message: "Selecione o ciclo e o colaborador para continuar.", fieldErrors: {} };
  }

  const rawAnswers: Record<string, string> = {};
  let answerCount = 0;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer.")) continue;
    answerCount += 1;
    if (answerCount > 50 || typeof value !== "string" || value.length > 4000) {
      return { message: "O formulário excedeu os limites permitidos.", fieldErrors: {} };
    }
    const questionId = key.slice("answer.".length);
    if (!z.string().uuid().safeParse(questionId).success) {
      return { message: "O formulário enviado é inválido.", fieldErrors: {} };
    }
    rawAnswers[questionId] = value;
  }

  const actor = await getAuthenticatedActor();
  if (!actor) {
    return { message: "Sua sessão expirou. Entre novamente para continuar.", fieldErrors: {} };
  }

  const result = await saveFeedback(actor, { ...parsed.data, rawAnswers });
  if (!result.ok) {
    return { message: result.message, fieldErrors: result.fieldErrors };
  }

  revalidatePath("/portal/meus-feedbacks");
  redirect(`/portal/meus-feedbacks?salvo=${result.status === "SUBMITTED" ? "enviado" : "rascunho"}`);
}
