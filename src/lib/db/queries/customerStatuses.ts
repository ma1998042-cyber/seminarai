import { eq, and, asc } from "drizzle-orm";
import { customerStatuses } from "../schema";
import type { Database } from "..";

export async function getCustomerStatuses(db: Database, orgId: string) {
  return db.query.customerStatuses.findMany({
    where: eq(customerStatuses.organizationId, orgId),
    orderBy: [asc(customerStatuses.sortOrder)],
  });
}

export async function createCustomerStatus(
  db: Database,
  data: {
    organizationId: string;
    name: string;
    color: string;
    sortOrder?: number;
  },
) {
  const [status] = await db.insert(customerStatuses).values(data).returning();
  return status;
}

export async function updateCustomerStatus(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<{
    name: string;
    color: string;
    sortOrder: number;
  }>,
) {
  const [status] = await db
    .update(customerStatuses)
    .set(data)
    .where(and(eq(customerStatuses.id, id), eq(customerStatuses.organizationId, orgId)))
    .returning();
  return status;
}

export async function deleteCustomerStatus(db: Database, orgId: string, id: string) {
  const [deleted] = await db
    .delete(customerStatuses)
    .where(and(eq(customerStatuses.id, id), eq(customerStatuses.organizationId, orgId)))
    .returning();
  return deleted;
}
