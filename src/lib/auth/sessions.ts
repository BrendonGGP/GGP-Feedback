import { createHash, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const hashSessionNonce = (nonce: string): string =>
  createHash("sha256").update(nonce, "utf8").digest("hex");

export const sessionNonceMatches = (
  persistedHash: string,
  nonce: string,
): boolean => {
  const actualHash = Buffer.from(hashSessionNonce(nonce), "hex");
  const expectedHash = Buffer.from(persistedHash, "hex");

  return (
    actualHash.length === expectedHash.length &&
    timingSafeEqual(actualHash, expectedHash)
  );
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await prisma.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllSessions = async (accountId: string): Promise<void> => {
  const now = new Date();

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.accessAccount.update({
      where: { id: accountId },
      data: { sessionVersion: { increment: 1 } },
    }),
  ]);
};
