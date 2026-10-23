"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createManagedAccount,
  deleteManagedAccount,
  revokeManagedAccountSessions,
  updateManagedAccount,
} from "@/lib/administration/account-management";
import { signOut } from "@/auth";
import { getAuthenticatedActor } from "@/lib/auth/session";
import {
  changeManagedAccountPassword,
  changeOwnPassword,
  managedPasswordSchema,
  ownPasswordChangeSchema,
} from "@/lib/auth/password-change";
import { createCompanyBySystemAdmin } from "@/lib/hr/organization-management";
import { restoreDeletedPerson } from "@/lib/hr/person-access";

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

export async function createAccountAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");

  const result = await createManagedAccount(actor, {
    fullName: getFormString(formData.get("fullName")),
    corporateEmail: getFormString(formData.get("corporateEmail")),
    jobTitle: getFormString(formData.get("jobTitle")),
    employmentRegime: getFormString(formData.get("employmentRegime")),
    companyId: getFormString(formData.get("companyId")),
    departmentId: getFormString(formData.get("departmentId")),
    loginIdentifier: getFormString(formData.get("loginIdentifier")),
    roles: getFormStrings(formData.getAll("roles")),
    temporaryPassword: getFormString(formData.get("temporaryPassword")),
    confirmPassword: getFormString(formData.get("confirmPassword")),
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

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");

  const result = await deleteManagedAccount(
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
    return finishAction({ ok: false, message });
  }
  finishAction({ ok: true, message: "Senha temporária definida. A conta deverá alterá-la no próximo acesso." });
}

export async function createCompanyAdminAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  finishAction(await createCompanyBySystemAdmin(actor, { name: getFormString(formData.get("name")) }));
}

export async function restorePersonAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  finishAction(await restoreDeletedPerson(actor, getFormString(formData.get("personId"))));
}

const OWN_PASSWORD_ERRORS: Record<string, string> = {
  PASSWORD_CURRENT_INVALID: "A senha atual não confere.",
  PASSWORD_REUSE_NOT_ALLOWED: "Escolha uma senha diferente da atual.",
};

export async function changeOwnPasswordAction(formData: FormData): Promise<void> {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  const parsed = ownPasswordChangeSchema.safeParse({
    currentPassword: getFormString(formData.get("currentPassword")),
    newPassword: getFormString(formData.get("newPassword")),
    confirmPassword: getFormString(formData.get("confirmPassword")),
  });
  if (!parsed.success) {
    return finishAction({ ok: false, message: parsed.error.issues[0]?.message ?? "Revise a nova senha." });
  }
  try {
    await changeOwnPassword(actor, parsed.data);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return finishAction({ ok: false, message: OWN_PASSWORD_ERRORS[code] ?? "Não foi possível alterar a sua senha." });
  }
  // As sessões foram encerradas: entra de novo com a senha nova.
  await signOut({ redirectTo: "/" });
}
