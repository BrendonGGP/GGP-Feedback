import type { Prisma } from "@prisma/client";

import type { AuthenticatedActor } from "@/lib/auth/session";
import {
  hasValidRoleCombination,
  isAccessRole,
} from "@/lib/authorization/access-control";
import { runtimePrisma } from "@/lib/infrastructure/database/prisma";
import { runWithRuntimeTransaction } from "@/lib/infrastructure/database/runtime-context";

/**
 * Runs a unit of business work on one database transaction with the actor
 * identity available to PostgreSQL RLS policies.
 *
 * The GUCs are transaction-local (`is_local = true`). They never persist on a
 * pooled connection after the transaction finishes. Callers must use the
 * transaction client supplied to the callback; queries made through the
 * global client would run on another connection and have no actor context.
 */
export const withDatabaseActor = async <T>(
  actor: AuthenticatedActor,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  },
): Promise<T> => {
  if (
    !actor.accountId ||
    !actor.personId ||
    actor.roles.length === 0 ||
    !actor.roles.every(isAccessRole) ||
    !hasValidRoleCombination(actor.roles)
  ) {
    throw new Error("INVALID_DATABASE_ACTOR");
  }

  return runtimePrisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT
        set_config('ggp.account_id', ${actor.accountId}, true),
        set_config('ggp.person_id', ${actor.personId}, true),
        set_config('ggp.roles', ${actor.roles.join(",")}, true)
    `;

    return runWithRuntimeTransaction(transaction, () => operation(transaction));
  }, options);
};
