import { prisma } from "@/lib/prisma";

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
