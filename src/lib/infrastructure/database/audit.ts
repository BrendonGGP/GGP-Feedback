import type { Prisma } from "@prisma/client";

/**
 * Appends an audit event inside a business transaction run by
 * `withDatabaseActor`.
 *
 * Uses `createMany` because it issues a plain INSERT without RETURNING: the
 * `ggp_runtime` role may insert audit events but cannot read them back, which
 * keeps the audit trail write-only for the application.
 */
export const recordAuditEvent = async (
  transaction: Prisma.TransactionClient,
  { data }: Readonly<{ data: Prisma.AuditEventCreateManyInput }>,
): Promise<void> => {
  await transaction.auditEvent.createMany({ data: [data] });
};
