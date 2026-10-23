import { adminPrisma } from "@/lib/infrastructure/database/prisma";

/*
 * Liga e desliga a conta de acesso de uma pessoa. Usa o cliente
 * administrativo (a role de runtime não altera contas); quem chama deve ter
 * checado a permissão antes.
 */

/** Desativa a conta da pessoa e encerra as sessões. Devolve se havia conta ativa. */
export const disableAccountOfPerson = async (personId: string): Promise<boolean> => {
  const account = await adminPrisma.accessAccount.findUnique({
    where: { personId },
    select: { id: true, status: true },
  });
  if (!account || account.status === "DISABLED") return false;
  const now = new Date();
  await adminPrisma.$transaction([
    adminPrisma.accessAccount.update({
      where: { id: account.id },
      data: { status: "DISABLED", sessionVersion: { increment: 1 } },
    }),
    adminPrisma.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
  return true;
};

/** Reativa a conta desativada da pessoa (o login volta a seguir as regras normais). */
export const enableAccountOfPerson = async (personId: string): Promise<boolean> => {
  const result = await adminPrisma.accessAccount.updateMany({
    where: { personId, status: "DISABLED" },
    data: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null },
  });
  return result.count > 0;
};
