import { createHash, randomBytes, randomUUID } from "node:crypto";

import { z } from "zod";

import {
  hasValidRoleCombination,
  isAccessRole,
  type AccessRole,
} from "@/lib/authorization/access-control";
import { prisma } from "@/lib/prisma";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password";

export const loginCredentialsSchema = z.object({
  loginIdentifier: z.string().trim().min(1).max(190),
  password: z.string().min(8).max(256),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

export const AUTH_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export type AuthenticatedUser = Readonly<{
  id: string;
  accountId: string;
  personId: string;
  roles: AccessRole[];
  sessionId: string;
  sessionVersion: number;
}>;

const hashSessionNonce = (nonce: string): string =>
  createHash("sha256").update(nonce, "utf8").digest("hex");

const verifyInvalidAttempt = async (password: unknown): Promise<void> => {
  await verifyPassword(
    DUMMY_PASSWORD_HASH,
    typeof password === "string" ? password : "invalid-login",
  );
};

const registerFailedAttempt = async (accountId: string): Promise<void> => {
  await prisma.$transaction(async (transaction) => {
    const account = await transaction.accessAccount.update({
      where: { id: accountId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });

    if (account.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
      await transaction.accessAccount.update({
        where: { id: accountId },
        data: {
          status: "LOCKED",
          lockedUntil: new Date(Date.now() + LOCK_DURATION_MS),
        },
      });
    }
  });
};

const authorizeProvisionedCredentialsUnsafe = async (
  rawCredentials: Partial<Record<string, unknown>> | undefined,
): Promise<AuthenticatedUser | null> => {
  const parsed = loginCredentialsSchema.safeParse(rawCredentials);

  if (!parsed.success) {
    await verifyInvalidAttempt(rawCredentials?.password);
    return null;
  }

  const account = await prisma.accessAccount.findFirst({
    where: {
      loginIdentifier: {
        equals: parsed.data.loginIdentifier,
        mode: "insensitive",
      },
    },
    include: {
      person: { select: { id: true } },
      roles: { select: { role: true } },
    },
  });

  if (!account) {
    await verifyInvalidAttempt(parsed.data.password);
    return null;
  }

  const passwordMatches = await verifyPassword(
    account.passwordHash,
    parsed.data.password,
  );
  const isLockedByTime =
    account.lockedUntil !== null && account.lockedUntil > new Date();
  const roles = account.roles.map(({ role }) => role);
  const hasValidRoles =
    roles.length > 0 &&
    roles.every(isAccessRole) &&
    hasValidRoleCombination(roles);

  if (!passwordMatches || account.status !== "ACTIVE" || isLockedByTime) {
    if (!passwordMatches && account.status === "ACTIVE") {
      await registerFailedAttempt(account.id);
    }
    return null;
  }

  // An account without a valid role must never receive a usable session.
  if (!hasValidRoles) {
    return null;
  }

  const sessionId = randomUUID();
  const sessionNonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000,
  );

  await prisma.$transaction([
    prisma.accessAccount.update({
      where: { id: account.id },
      data: {
        failedLoginCount: 0,
        lastLoginAt: new Date(),
      },
    }),
    prisma.userSession.create({
      data: {
        id: sessionId,
        accountId: account.id,
        tokenHash: hashSessionNonce(sessionNonce),
        expiresAt,
      },
    }),
  ]);

  return {
    id: account.id,
    accountId: account.id,
    personId: account.person.id,
    roles,
    sessionId,
    sessionVersion: account.sessionVersion,
  };
};

export const authorizeProvisionedCredentials = async (
  rawCredentials: Partial<Record<string, unknown>> | undefined,
): Promise<AuthenticatedUser | null> => {
  try {
    return await authorizeProvisionedCredentialsUnsafe(rawCredentials);
  } catch {
    // Authentication failures are intentionally indistinguishable to callers.
    return null;
  }
};
