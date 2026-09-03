"use server";

import { signOut } from "@/auth";
import { getAuthenticatedActor } from "@/lib/auth/session";
import {
  changeTemporaryPassword,
  passwordChangeSchema,
} from "@/lib/auth/password-change";

export type PasswordChangeState = Readonly<{
  error: string | null;
}>;

const genericError =
  "Não foi possível atualizar a senha. Tente novamente mais tarde.";

const getFormString = (value: FormDataEntryValue | null): string =>
  typeof value === "string" ? value : "";

export const changePasswordAction = async (
  _previousState: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> => {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (!actor || !actor.mustChangePassword) {
    return { error: genericError };
  }

  const parsed = passwordChangeSchema.safeParse({
    newPassword: getFormString(formData.get("newPassword")),
    confirmPassword: getFormString(formData.get("confirmPassword")),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? genericError,
    };
  }

  try {
    await changeTemporaryPassword(actor.accountId, parsed.data.newPassword);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PASSWORD_REUSE_NOT_ALLOWED"
    ) {
      return {
        error: "Escolha uma senha diferente da senha temporária.",
      };
    }

    return { error: genericError };
  }

  await signOut({ redirectTo: "/" });
  return { error: null };
};
