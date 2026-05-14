import { eq, and, sql } from "drizzle-orm";
import { events, eventRegistrations } from "../schema";
import type { Database } from "..";

// =============================================
// イベント CRUD（組織スコープ付き）
// =============================================

export async function getEvents(db: Database, orgId: string, visibility?: string) {
  return db.query.events.findMany({
    where: visibility
      ? and(eq(events.organizationId, orgId), eq(events.visibility, visibility))
      : eq(events.organizationId, orgId),
    orderBy: (events, { desc }) => [desc(events.createdAt)],
  });
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
    tags: string[];
    customFields: unknown[];
    settings: Record<string, unknown>;
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
