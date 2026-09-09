import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Development can point explicitly to the local PostgreSQL instance. Other
 * environments use Prisma's DATABASE_URL datasource until their database
 * connection is provisioned separately.
 */
const localDevelopmentUrl =
  process.env.NODE_ENV === "development"
    ? process.env.LOCAL_DATABASE_URL
    : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(localDevelopmentUrl
      ? { datasources: { db: { url: localDevelopmentUrl } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
