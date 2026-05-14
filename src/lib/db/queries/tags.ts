import { eq, and, sql } from "drizzle-orm";
import { tags, customerTags } from "../schema";
import type { Database } from "..";

export async function getTags(db: Database, orgId: string) {
  return db.query.tags.findMany({
    where: eq(tags.organizationId, orgId),
    orderBy: (t, { asc }) => [asc(t.name)],
  });
}

export async function getTagsWithCount(db: Database, orgId: string) {
  return db.query.tags.findMany({
    where: eq(tags.organizationId, orgId),
    orderBy: (t, { asc }) => [asc(t.name)],
    with: {
      customerTags: {
        columns: { customerId: true },
      },
    },
  });
}

export async function createTag(
  db: Database,
  data: {
    organizationId: string;
    name: string;
    color?: string;
    description?: string;
    isAuto?: boolean;
    autoRule?: Record<string, unknown> | null;
  },
) {
  const [tag] = await db.insert(tags).values(data).returning();
  return tag;
}

export async function updateTag(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<{
    name: string;
    color: string;
    description: string | null;
    isAuto: boolean;
    autoRule: Record<string, unknown> | null;
  }>,
) {
  const [tag] = await db
    .update(tags)
    .set(data)
    .where(and(eq(tags.id, id), eq(tags.organizationId, orgId)))
    .returning();
  return tag;
}

export async function deleteTag(db: Database, orgId: string, id: string) {
  const [deleted] = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.organizationId, orgId)))
    .returning();
  return deleted;
}
