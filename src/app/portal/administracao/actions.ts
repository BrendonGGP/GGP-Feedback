"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  revokeManagedAccountSessions,
  updateManagedAccount,
} from "@/lib/administration/account-management";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { changeManagedAccountPassword, managedPasswordSchema } from "@/lib/auth/password-change";

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

export async function changeAccountPasswordAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  const parsed = managedPasswordSchema.safeParse({
    accountId: getFormString(formData.get("accountId")),
    newPassword: getFormString(formData.get("newPassword")),
    confirmPassword: getFormString(formData.get("confirmPassword")),
  });
  if (!parsed.success) {
    return finishAction({ ok: false, message: parsed.error.issues[0]?.message ?? "Revise a nova senha." });
  }
  const input = parsed.data;
  try {
    await changeManagedAccountPassword(actor, input);
  } catch (error) {
    const message = error instanceof Error && error.message === "PASSWORD_REUSE_NOT_ALLOWED"
      ? "Escolha uma senha diferente da senha atual."
      : "Não foi possível alterar a senha da conta.";
    finishAction({ ok: false, message });
  }
  finishAction({ ok: true, message: "Senha temporária definida. A conta deverá alterá-la no próximo acesso." });
}
