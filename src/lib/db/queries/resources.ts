import { eq, and, asc } from "drizzle-orm";
import { resources } from "../schema";
import type { Database } from "..";

export async function getResources(db: Database, orgId: string) {
  return db.query.resources.findMany({
    where: eq(resources.organizationId, orgId),
    orderBy: [asc(resources.sortOrder)],
  });
}

export async function getResource(db: Database, orgId: string, id: string) {
  return db.query.resources.findFirst({
    where: and(eq(resources.id, id), eq(resources.organizationId, orgId)),
  });
}

export async function getPublishedResources(db: Database) {
  return db.query.resources.findMany({
    where: eq(resources.isPublished, true),
    orderBy: [asc(resources.sortOrder)],
  });
}

export async function createResource(
  db: Database,
  data: typeof resources.$inferInsert,
) {
  const [row] = await db.insert(resources).values(data).returning();
  return row;
}

export async function updateResource(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof resources.$inferInsert, "id" | "organizationId">>,
) {
  const [row] = await db
    .update(resources)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(resources.id, id), eq(resources.organizationId, orgId)))
    .returning();
  return row;
}

export async function deleteResource(db: Database, orgId: string, id: string) {
  await db
    .delete(resources)
    .where(and(eq(resources.id, id), eq(resources.organizationId, orgId)));
}
