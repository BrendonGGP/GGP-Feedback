import { z } from "zod";

import {
  getPasswordPolicyError,
  hashPassword,
  PASSWORD_MAX_LENGTH,
  verifyPassword,
} from "@/lib/auth/password";
import { adminPrisma } from "@/lib/prisma";
import { canAdministerSystem } from "@/lib/authorization/access-control";
import type { AuthenticatedActor } from "@/lib/auth/session";

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

export const managedPasswordSchema = passwordChangeSchema.extend({
  accountId: z.string().uuid(),
});

export const changeManagedAccountPassword = async (
  actor: AuthenticatedActor,
  input: z.infer<typeof managedPasswordSchema>,
): Promise<void> => {
  if (!canAdministerSystem(actor) || input.accountId === actor.accountId) {
    throw new Error("PASSWORD_ADMIN_NOT_ALLOWED");
  }
  const account = await adminPrisma.accessAccount.findUnique({
    where: { id: input.accountId },
    select: { id: true, passwordHash: true },
  });
  if (!account) throw new Error("PASSWORD_ACCOUNT_NOT_FOUND");
  if (await verifyPassword(account.passwordHash, input.newPassword)) {
    throw new Error("PASSWORD_REUSE_NOT_ALLOWED");
  }
  const passwordHash = await hashPassword(input.newPassword);
  const changedAt = new Date();
  await adminPrisma.$transaction(async (transaction) => {
    await transaction.accessAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: changedAt,
        status: "ACTIVE",
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    await transaction.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: changedAt },
    });
    await transaction.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        requestId: crypto.randomUUID(),
        action: "RESET_ACCOUNT_PASSWORD",
        entityType: "ACCESS_ACCOUNT",
        entityId: account.id,
        result: "SUCCESS",
        metadata: { mustChangePassword: true, sessionsRevoked: true },
      },
    });
  });
};

export const changeTemporaryPassword = async (
  accountId: string,
  newPassword: string,
): Promise<void> => {
  if (getPasswordPolicyError(newPassword, "A nova senha")) {
    throw new Error("PASSWORD_POLICY_INVALID");
  }

  const account = await adminPrisma.accessAccount.findUnique({
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

  await adminPrisma.$transaction(async (transaction) => {
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
