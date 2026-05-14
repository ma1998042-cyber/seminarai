import { eq, sql } from "drizzle-orm";
import { adminUsers, organizations, customers, events, surveys } from "../schema";
import type { Database } from "..";

export async function isAdminUser(db: Database, userId: string) {
  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, userId),
    columns: { id: true },
  });
  return !!admin;
}

export async function getAdminStats(db: Database) {
  const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers);
  const [eventCount] = await db.select({ count: sql<number>`count(*)` }).from(events);
  const [surveyCount] = await db.select({ count: sql<number>`count(*)` }).from(surveys);

  return {
    organizations: orgCount.count,
    customers: customerCount.count,
    events: eventCount.count,
    surveys: surveyCount.count,
  };
}
