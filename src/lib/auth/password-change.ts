import { z } from "zod";

import {
  getPasswordPolicyError,
  hashPassword,
  PASSWORD_MAX_LENGTH,
  verifyPassword,
} from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const passwordField = (label: string) =>
  z.string().max(PASSWORD_MAX_LENGTH, `${label} pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`).superRefine((value, context) => {
    const error = getPasswordPolicyError(value, label);
    if (error) context.addIssue({ code: "custom", message: error });
  });

export const passwordChangeSchema = z
  .object({
    newPassword: passwordField("A nova senha"),
    confirmPassword: passwordField("A confirmação"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const changeTemporaryPassword = async (
  accountId: string,
  newPassword: string,
): Promise<void> => {
  if (getPasswordPolicyError(newPassword, "A nova senha")) {
    throw new Error("PASSWORD_POLICY_INVALID");
  }

  const account = await prisma.accessAccount.findUnique({
    where: { id: accountId },
    select: {
      passwordHash: true,
      mustChangePassword: true,
      status: true,
    },
  });

  if (
    !account ||
    account.status !== "ACTIVE" ||
    !account.mustChangePassword
  ) {
    throw new Error("PASSWORD_CHANGE_NOT_ALLOWED");
  }

  if (await verifyPassword(account.passwordHash, newPassword)) {
    throw new Error("PASSWORD_REUSE_NOT_ALLOWED");
  }

  const passwordHash = await hashPassword(newPassword);
  const changedAt = new Date();

  await prisma.$transaction(async (transaction) => {
    const changedAccount = await transaction.accessAccount.updateMany({
      where: {
        id: accountId,
        status: "ACTIVE",
        mustChangePassword: true,
        passwordHash: account.passwordHash,
      },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: changedAt,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });

    if (changedAccount.count !== 1) {
      throw new Error("PASSWORD_CHANGE_CONFLICT");
    }

    await transaction.userSession.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: changedAt },
    });
  });
};
