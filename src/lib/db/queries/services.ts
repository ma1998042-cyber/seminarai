import { eq, and, asc } from "drizzle-orm";
import { services } from "../schema";
import type { Database } from "..";

export async function getServices(db: Database, orgId: string) {
  return db.query.services.findMany({
    where: eq(services.organizationId, orgId),
    orderBy: [asc(services.sortOrder)],
  });
}

export async function getService(db: Database, orgId: string, id: string) {
  return db.query.services.findFirst({
    where: and(eq(services.id, id), eq(services.organizationId, orgId)),
  });
}

export async function getPublishedServices(db: Database, orgId: string) {
  return db.query.services.findMany({
    where: and(eq(services.organizationId, orgId), eq(services.isPublished, true)),
    orderBy: [asc(services.sortOrder)],
  });
}

export async function getAllPublishedServices(db: Database) {
  return db.query.services.findMany({
    where: eq(services.isPublished, true),
    orderBy: [asc(services.sortOrder)],
  });
}

export async function createService(
  db: Database,
  data: typeof services.$inferInsert,
) {
  const [row] = await db.insert(services).values(data).returning();
  return row;
}

export async function updateService(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof services.$inferInsert, "id" | "organizationId">>,
) {
  const [row] = await db
    .update(services)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(services.id, id), eq(services.organizationId, orgId)))
    .returning();
  return row;
}

export async function deleteService(db: Database, orgId: string, id: string) {
  await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.organizationId, orgId)));
}
