import { AsyncLocalStorage } from "node:async_hooks";

import type { Prisma } from "@prisma/client";

const runtimeTransactionStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

export const getRuntimeTransaction = (): Prisma.TransactionClient | undefined =>
  runtimeTransactionStorage.getStore();

export const runWithRuntimeTransaction = <T>(
  transaction: Prisma.TransactionClient,
  operation: () => Promise<T> | T,
): Promise<T> => runtimeTransactionStorage.run(transaction, async () => operation());
