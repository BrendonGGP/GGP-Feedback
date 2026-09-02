import { auth } from "@/auth";
import {
  hasValidRoleCombination,
  isAccessRole,
  type AccessRole,
  type AuthorizationActor,
} from "@/lib/authorization/access-control";
import { prisma } from "@/lib/prisma";

export type AuthenticatedActor = AuthorizationActor &
  Readonly<{
    accountId: string;
  }>;

export const getAuthenticatedActor = async (): Promise<AuthenticatedActor | null> => {
  const session = await auth();
  const accountId = session?.user?.accountId;

  if (!accountId || !session.user.personId) {
    return null;
  }

  const account = await prisma.accessAccount.findUnique({
    where: { id: accountId },
    include: { roles: { select: { role: true } } },
  });

  if (
    !account ||
    account.status !== "ACTIVE" ||
    (account.lockedUntil !== null && account.lockedUntil > new Date())
  ) {
    return null;
  }

  const roles = account.roles.map(({ role }) => role);
  if (
    roles.length === 0 ||
    !roles.every(isAccessRole) ||
    !hasValidRoleCombination(roles)
  ) {
    return null;
  }

  return {
    accountId: account.id,
    personId: account.personId,
    roles: roles as AccessRole[],
  };
};

export const requireAuthenticatedActor = async (): Promise<AuthenticatedActor> => {
  const actor = await getAuthenticatedActor();
  if (!actor) {
    throw new Error("UNAUTHENTICATED");
  }
  return actor;
};
