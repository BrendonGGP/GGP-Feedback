"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/lib/auth/session";
import {
  createHrCycle,
  updateHrCycleStatus,
} from "@/lib/hr/cycle-management";

export type HrCycleActionState = Readonly<{
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  success: boolean;
}>;

const initialActionState: HrCycleActionState = {
  message: "",
  fieldErrors: {},
  success: false,
};

const getFormString = (value: FormDataEntryValue | null): string =>
  typeof value === "string" ? value : "";

export async function createCycleAction(
  _previousState: HrCycleActionState,
  formData: FormData,
): Promise<HrCycleActionState> {
  const actor = await getAuthenticatedActor();
  if (!actor) return { ...initialActionState, message: "Sua sessão expirou. Entre novamente." };

  const result = await createHrCycle(actor, {
    name: getFormString(formData.get("name")),
    startsAt: getFormString(formData.get("startsAt")),
    endsAt: getFormString(formData.get("endsAt")),
    templateId: getFormString(formData.get("templateId")),
    selfAssessmentEnabled: formData.get("selfAssessmentEnabled") === "on",
  });

  if (!result.ok) {
    return {
      message: result.message,
      fieldErrors: result.fieldErrors,
      success: false,
    };
  }

  revalidatePath("/portal/rh");
  return { message: result.message, fieldErrors: {}, success: true };
}

export async function updateCycleStatusAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/portal/rh?erro=Sua%20sess%C3%A3o%20expirou.%20Entre%20novamente.");

  const result = await updateHrCycleStatus(
    actor,
    getFormString(formData.get("cycleId")),
    getFormString(formData.get("targetStatus")),
  );
  if (!result.ok) redirect(`/portal/rh?erro=${encodeURIComponent(result.message)}`);

  revalidatePath("/portal/rh");
  redirect("/portal/rh?atualizado=1");
}
