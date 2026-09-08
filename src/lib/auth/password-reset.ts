import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import { getPasswordPolicyError, hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const resetTokenSchema = z.string().min(40).max(100);

export const passwordResetRequestSchema = z.object({
  loginIdentifier: z.string().trim().min(1).max(190),
});

export const passwordResetSchema = z
  .object({
    token: resetTokenSchema,
    newPassword: z.string().min(9).max(128),
    confirmPassword: z.string().min(9).max(128),
  })
  .superRefine((value, context) => {
    const policyError = getPasswordPolicyError(value.newPassword, "A nova senha");
    if (policyError) context.addIssue({ code: "custom", message: policyError, path: ["newPassword"] });
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({ code: "custom", message: "As senhas precisam ser iguais.", path: ["confirmPassword"] });
    }
  });

const hashResetToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export type PasswordResetRequestResult = Readonly<{
  resetToken: string | null;
}>;

export const requestPasswordReset = async (
  loginIdentifier: string,
): Promise<PasswordResetRequestResult> => {
  const parsed = passwordResetRequestSchema.safeParse({ loginIdentifier });
  if (!parsed.success) return { resetToken: null };

  const account = await prisma.accessAccount.findFirst({
    where: {
      loginIdentifier: { equals: parsed.data.loginIdentifier, mode: "insensitive" },
      status: { in: ["ACTIVE", "LOCKED"] },
    },
    select: { id: true, passwordResetExpiresAt: true },
  });
  if (!account) return { resetToken: null };

  // Avoid repeatedly rotating a valid token and flooding a mailbox. A new
  // request becomes available one minute after the previous one.
  if (
    account.passwordResetExpiresAt &&
    account.passwordResetExpiresAt.getTime() > Date.now() + RESET_TOKEN_TTL_MS - 60_000
  ) {
    return { resetToken: null };
  }

  const resetToken = randomBytes(32).toString("base64url");
  await prisma.accessAccount.update({
    where: { id: account.id },
    data: {
      passwordResetTokenHash: hashResetToken(resetToken),
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  return { resetToken };
};

export const completePasswordReset = async (
  token: string,
  newPassword: string,
): Promise<void> => {
  const parsedToken = resetTokenSchema.safeParse(token);
  if (!parsedToken.success || getPasswordPolicyError(newPassword, "A nova senha")) {
    throw new Error("PASSWORD_RESET_INVALID");
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const account = await transaction.accessAccount.findFirst({
      where: {
        passwordResetTokenHash: hashResetToken(parsedToken.data),
        passwordResetExpiresAt: { gt: now },
        status: { in: ["ACTIVE", "LOCKED"] },
      },
      select: { id: true, passwordHash: true },
    });
    if (!account) throw new Error("PASSWORD_RESET_INVALID");
    if (await verifyPassword(account.passwordHash, newPassword)) {
      throw new Error("PASSWORD_RESET_REUSE");
    }

    const updated = await transaction.accessAccount.updateMany({
      where: {
        id: account.id,
        passwordResetTokenHash: hashResetToken(parsedToken.data),
        passwordResetExpiresAt: { gt: now },
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        mustChangePassword: false,
        passwordChangedAt: now,
        status: "ACTIVE",
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new Error("PASSWORD_RESET_CONFLICT");

    await transaction.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: account.id,
        requestId: crypto.randomUUID(),
        action: "RESET_PASSWORD",
        entityType: "AccessAccount",
        entityId: account.id,
        result: "SUCCESS",
        metadata: { method: "one_time_token" },
      },
    });
  }, { isolationLevel: "Serializable" });
};
