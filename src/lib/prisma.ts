import { PrismaClient } from "@prisma/client";

import { resolveDatabaseConnections } from "@/lib/db/connection-config";
import { getRuntimeTransaction } from "@/lib/db/runtime-context";

const globalForPrisma = globalThis as unknown as {
  runtimePrisma?: PrismaClient;
  adminPrisma?: PrismaClient;
};

const environment = process.env.NODE_ENV === "production"
  ? "production"
  : process.env.NODE_ENV === "test"
    ? "test"
    : "development";

const logLevels = environment === "development"
  ? (["error", "warn"] as const)
  : (["error"] as const);

/**
 * The runtime client is the only client allowed to serve functional portal
 * queries. In local development LOCAL_DATABASE_URL keeps the existing
 * PostgreSQL setup explicit; deployed environments use DATABASE_URL.
 */
const { runtimeUrl: runtimeDatabaseUrl, adminUrl: adminDatabaseUrl } =
  resolveDatabaseConnections(process.env, environment);

/**
 * Authentication and technical administration need access to the technical
 * tables that are intentionally not granted to ggp_runtime. They use an
 * independent pool and URL. ADMIN_DATABASE_URL is the production setting;
 * DIRECT_URL remains a local/migration-compatible fallback until that
 * dedicated administrative secret is provisioned.
 */
const createClient = (url: string | undefined): PrismaClient =>
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: [...logLevels],
  });

const runtimeClient =
  globalForPrisma.runtimePrisma ?? createClient(runtimeDatabaseUrl);

/**
 * Routes runtime queries to the current actor transaction. This keeps legacy
 * service code inside the same RLS context while it is incrementally migrated
 * to explicit transaction clients. Nested $transaction calls reuse the
 * existing transaction instead of opening a second connection.
 */
export const runtimePrisma = new Proxy(runtimeClient, {
  get(target, property, receiver) {
    const transaction = getRuntimeTransaction();
    if (!transaction) return Reflect.get(target, property, receiver);

    if (property === "$transaction") {
      return async (
        operations: unknown,
      ): Promise<unknown> => {
        if (typeof operations === "function") {
          return operations(transaction);
        }
        return Promise.all(operations as Promise<unknown>[]);
      };
    }

    const value = Reflect.get(transaction, property, transaction);
    return typeof value === "function" ? value.bind(transaction) : value;
  },
}) as PrismaClient;

export const adminPrisma =
  globalForPrisma.adminPrisma ?? createClient(adminDatabaseUrl);

if (environment !== "production") {
  globalForPrisma.runtimePrisma = runtimeClient;
  globalForPrisma.adminPrisma = adminPrisma;
}
