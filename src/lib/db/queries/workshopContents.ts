import { eq, and, asc } from "drizzle-orm";
import { workshopContents } from "../schema";
import type { Database } from "..";

export async function getWorkshopContents(db: Database, orgId: string, eventId: string) {
  return db.query.workshopContents.findMany({
    where: and(
      eq(workshopContents.organizationId, orgId),
      eq(workshopContents.eventId, eventId),
    ),
    orderBy: [asc(workshopContents.sortOrder)],
  });
}

export async function getWorkshopContent(db: Database, orgId: string, id: string) {
  return db.query.workshopContents.findFirst({
    where: and(eq(workshopContents.id, id), eq(workshopContents.organizationId, orgId)),
  });
}

export async function createWorkshopContent(
  db: Database,
  data: typeof workshopContents.$inferInsert,
) {
  const [row] = await db.insert(workshopContents).values(data).returning();
  return row;
}

export async function updateWorkshopContent(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof workshopContents.$inferInsert, "id" | "organizationId">>,
) {
  const [row] = await db
    .update(workshopContents)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(workshopContents.id, id), eq(workshopContents.organizationId, orgId)))
    .returning();
  return row;
}

export async function deleteWorkshopContent(db: Database, orgId: string, id: string) {
  await db
    .delete(workshopContents)
    .where(and(eq(workshopContents.id, id), eq(workshopContents.organizationId, orgId)));
}
