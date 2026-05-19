import { eq } from "drizzle-orm";
import { resourceDownloadLeads } from "../schema";
import type { Database } from "..";

export async function createDownloadLead(
  db: Database,
  data: typeof resourceDownloadLeads.$inferInsert,
) {
  const [row] = await db.insert(resourceDownloadLeads).values(data).returning();
  return row;
}

export async function getDownloadLeadsByResource(db: Database, resourceId: string) {
  return db.query.resourceDownloadLeads.findMany({
    where: eq(resourceDownloadLeads.resourceId, resourceId),
  });
}
