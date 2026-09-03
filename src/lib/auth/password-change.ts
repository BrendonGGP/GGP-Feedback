import { z } from "zod";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export const passwordChangeSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, "A nova senha precisa ter pelo menos 12 caracteres.")
      .max(128, "A nova senha pode ter no máximo 128 caracteres."),
    confirmPassword: z
      .string()
      .min(12, "A confirmação precisa ter pelo menos 12 caracteres.")
      .max(128, "A confirmação pode ter no máximo 128 caracteres."),
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
