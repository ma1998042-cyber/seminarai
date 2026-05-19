import { eq, and, asc } from "drizzle-orm";
import { caseStudies } from "../schema";
import type { Database } from "..";

export async function getCaseStudies(db: Database, orgId: string) {
  return db.query.caseStudies.findMany({
    where: eq(caseStudies.organizationId, orgId),
    orderBy: [asc(caseStudies.sortOrder)],
  });
}

export async function getCaseStudy(db: Database, orgId: string, id: string) {
  return db.query.caseStudies.findFirst({
    where: and(eq(caseStudies.id, id), eq(caseStudies.organizationId, orgId)),
  });
}

export async function getPublishedCaseStudies(db: Database) {
  return db.query.caseStudies.findMany({
    where: eq(caseStudies.isPublished, true),
    orderBy: [asc(caseStudies.sortOrder)],
  });
}

export async function createCaseStudy(
  db: Database,
  data: typeof caseStudies.$inferInsert,
) {
  const [row] = await db.insert(caseStudies).values(data).returning();
  return row;
}

export async function updateCaseStudy(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof caseStudies.$inferInsert, "id" | "organizationId">>,
) {
  const [row] = await db
    .update(caseStudies)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(caseStudies.id, id), eq(caseStudies.organizationId, orgId)))
    .returning();
  return row;
}

export async function deleteCaseStudy(db: Database, orgId: string, id: string) {
  await db
    .delete(caseStudies)
    .where(and(eq(caseStudies.id, id), eq(caseStudies.organizationId, orgId)));
}
