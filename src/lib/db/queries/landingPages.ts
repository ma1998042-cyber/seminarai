import { eq, and, desc } from "drizzle-orm";
import { landingPages, lpSubmissions } from "../schema";
import type { Database } from "..";

export async function getLandingPages(db: Database, orgId: string) {
  return db.query.landingPages.findMany({
    where: eq(landingPages.organizationId, orgId),
    orderBy: [desc(landingPages.createdAt)],
  });
}

export async function getLandingPage(db: Database, orgId: string, id: string) {
  return db.query.landingPages.findFirst({
    where: and(eq(landingPages.id, id), eq(landingPages.organizationId, orgId)),
  });
}

export async function getPublicLandingPage(db: Database, slug: string) {
  return db.query.landingPages.findFirst({
    where: and(eq(landingPages.slug, slug), eq(landingPages.isPublished, true)),
  });
}

export async function createLandingPage(
  db: Database,
  data: typeof landingPages.$inferInsert,
) {
  const [lp] = await db.insert(landingPages).values(data).returning();
  return lp;
}

export async function updateLandingPage(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<Omit<typeof landingPages.$inferInsert, "id" | "organizationId">>,
) {
  const [lp] = await db
    .update(landingPages)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(landingPages.id, id), eq(landingPages.organizationId, orgId)))
    .returning();
  return lp;
}

export async function deleteLandingPage(db: Database, orgId: string, id: string) {
  await db
    .delete(landingPages)
    .where(and(eq(landingPages.id, id), eq(landingPages.organizationId, orgId)));
}

export async function getLpSubmissions(db: Database, landingPageId: string) {
  return db.query.lpSubmissions.findMany({
    where: eq(lpSubmissions.landingPageId, landingPageId),
    with: { customer: true },
    orderBy: [desc(lpSubmissions.createdAt)],
  });
}

export async function createLpSubmission(
  db: Database,
  data: typeof lpSubmissions.$inferInsert,
) {
  const [submission] = await db.insert(lpSubmissions).values(data).returning();
  return submission;
}

export async function getLpSubmissionCount(db: Database, landingPageId: string) {
  const results = await db.query.lpSubmissions.findMany({
    where: eq(lpSubmissions.landingPageId, landingPageId),
    columns: { id: true },
  });
  return results.length;
}
