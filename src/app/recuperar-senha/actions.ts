"use server";

import { redirect } from "next/navigation";

import {
  completePasswordReset,
  passwordResetRequestSchema,
  passwordResetSchema,
  requestPasswordReset,
} from "@/lib/auth/password-reset";

export type PasswordResetRequestState = Readonly<{
  submitted: boolean;
  devResetPath: string | null;
  error: string | null;
}>;

export type PasswordResetState = Readonly<{
  error: string | null;
}>;

const getString = (value: FormDataEntryValue | null): string =>
  typeof value === "string" ? value : "";

export async function requestPasswordResetAction(
  _previousState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const loginIdentifier = getString(formData.get("loginIdentifier"));
  const parsed = passwordResetRequestSchema.safeParse({ loginIdentifier });
  if (!parsed.success) {
    return { submitted: false, devResetPath: null, error: "Informe seu e-mail ou identificador." };
  }

  try {
    const result = await requestPasswordReset(parsed.data.loginIdentifier);
    const devResetPath =
      process.env.NODE_ENV === "production" || !result.resetToken
        ? null
        : `/recuperar-senha?token=${encodeURIComponent(result.resetToken)}`;
    return { submitted: true, devResetPath, error: null };
  } catch {
    return { submitted: true, devResetPath: null, error: null };
  }
}

export async function completePasswordResetAction(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = passwordResetSchema.safeParse({
    token: getString(formData.get("token")),
    newPassword: getString(formData.get("newPassword")),
    confirmPassword: getString(formData.get("confirmPassword")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  }

  try {
    await completePasswordReset(parsed.data.token, parsed.data.newPassword);
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_RESET_REUSE") {
      return { error: "Escolha uma senha diferente da senha anterior." };
    }
    return { error: "O link é inválido ou expirou. Solicite uma nova recuperação." };
  }

  redirect("/?reset=sucesso");
}
