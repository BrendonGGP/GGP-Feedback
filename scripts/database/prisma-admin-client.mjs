import { PrismaClient } from "@prisma/client";

const adminDatabaseUrl =
  process.env.ADMIN_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;

/**
 * Seeds and imports are administrative operations. Prefer the dedicated
 * administrative URL, then keep the local migration URL as a compatibility
 * fallback without logging its value.
 */
export const createAdminPrismaClient = () =>
  new PrismaClient({
    ...(adminDatabaseUrl
      ? { datasources: { db: { url: adminDatabaseUrl } } }
      : {}),
  });
