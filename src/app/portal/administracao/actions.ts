"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  revokeManagedAccountSessions,
  updateManagedAccount,
} from "@/lib/administration/account-management";
import { getAuthenticatedActor } from "@/lib/auth/session";

const getFormString = (value: FormDataEntryValue | null): string =>
  typeof value === "string" ? value : "";

const getFormStrings = (values: FormDataEntryValue[]): string[] =>
  values.filter((value): value is string => typeof value === "string");

const finishAction = (result: Readonly<{ ok: boolean; message: string }>): never => {
  revalidatePath("/portal/administracao");
  const key = result.ok ? "sucesso" : "erro";
  redirect(`/portal/administracao?${key}=${encodeURIComponent(result.message)}`);
};

export async function updateAccountAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");

  const result = await updateManagedAccount(actor, {
    accountId: getFormString(formData.get("accountId")),
    status: getFormString(formData.get("status")),
    roles: getFormStrings(formData.getAll("roles")),
  });
  finishAction(result);
}

export async function revokeAccountSessionsAction(
  formData: FormData,
): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");

  const result = await revokeManagedAccountSessions(
    actor,
    getFormString(formData.get("accountId")),
  );
  finishAction(result);
}
