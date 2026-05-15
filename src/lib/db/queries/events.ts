import { eq, and, sql, inArray, gte, asc } from "drizzle-orm";
import { events, eventRegistrations, customers } from "../schema";
import type { Database } from "..";

// =============================================
// イベント CRUD（組織スコープ付き）
// =============================================

export async function getEvents(
  db: Database,
  orgId: string,
  options?: {
    visibility?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where = options?.visibility
    ? and(eq(events.organizationId, orgId), eq(events.visibility, options.visibility))
    : eq(events.organizationId, orgId);

  return db.query.events.findMany({
    where,
    orderBy: (events, { desc }) => [desc(events.createdAt)],
    ...(options?.limit !== undefined && { limit: options.limit }),
    ...(options?.offset !== undefined && { offset: options.offset }),
  });
}

export async function countEvents(db: Database, orgId: string, visibility?: string) {
  const conditions = [eq(events.organizationId, orgId)];
  if (visibility) {
    conditions.push(eq(events.visibility, visibility));
  }
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(...conditions));
  return Number(result[0]?.count ?? 0);
}

export async function getEventById(db: Database, orgId: string, id: string) {
  return db.query.events.findFirst({
    where: and(eq(events.id, id), eq(events.organizationId, orgId)),
  });
}

export async function createEvent(
  db: Database,
  data: {
    organizationId: string;
    title: string;
    description?: string;
    eventType?: string;
    status?: string;
    visibility?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    isOnline?: boolean;
    onlineUrl?: string;
    capacity?: number;
    thumbnailUrl?: string;
    imageUrls?: string[];
    tags?: string[];
    customFields?: unknown[];
    settings?: Record<string, unknown>;
    createdBy?: string;
  },
) {
  const [event] = await db.insert(events).values(data).returning();
  return event;
}

export async function updateEvent(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    eventType: string;
    status: string;
    visibility: string;
    startDate: string | null;
    endDate: string | null;
    location: string | null;
    isOnline: boolean;
    onlineUrl: string | null;
    capacity: number | null;
    registrationCount: number;
    thumbnailUrl: string | null;
    imageUrls: string[];
    tags: string[];
    customFields: unknown[];
    settings: Record<string, unknown>;
    showRemainingCapacity: number;
  }>,
) {
  const [event] = await db
    .update(events)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(events.id, id), eq(events.organizationId, orgId)))
    .returning();
  return event;
}

// =============================================
// 公開ページ用クエリ
// =============================================

export async function getPublicEvents(db: Database) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return db.query.events.findMany({
    where: and(
      eq(events.visibility, "public"),
      eq(events.status, "active"),
      gte(events.startDate, today),
    ),
    orderBy: [asc(events.startDate)],
  });
}

export async function getPublicEvent(db: Database, eventId: string) {
  return db.query.events.findFirst({
    where: and(
      eq(events.id, eventId),
      inArray(events.visibility, ["public", "unlisted"]),
      eq(events.status, "active"),
    ),
  });
}

// =============================================
// イベント参加者
// =============================================

export async function getEventRegistrations(db: Database, eventId: string) {
  return db.query.eventRegistrations.findMany({
    where: eq(eventRegistrations.eventId, eventId),
    with: { customer: true },
    orderBy: (reg, { desc }) => [desc(reg.registeredAt)],
  });
}

export async function upsertEventRegistration(
  db: Database,
  data: {
    eventId: string;
    customerId?: string;
    organizationId: string;
    email: string;
    fullName?: string;
    status?: string;
  },
) {
  const [registration] = await db
    .insert(eventRegistrations)
    .values(data)
    .onConflictDoUpdate({
      target: [eventRegistrations.eventId, eventRegistrations.email],
      set: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })
    .returning();
  return registration;
}
