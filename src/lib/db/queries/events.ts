import { eq, and, sql, inArray, gte, lt, asc, like } from "drizzle-orm";
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
    ended?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const conditions = [eq(events.organizationId, orgId)];
  if (options?.visibility) {
    conditions.push(eq(events.visibility, options.visibility));
  }
  if (options?.ended !== undefined) {
    const today = new Date().toISOString().split("T")[0];
    if (options.ended) {
      // 終了済み: startDate < today (startDateがnullのものは含めない)
      conditions.push(sql`${events.startDate} IS NOT NULL`);
      conditions.push(lt(events.startDate, today));
    } else {
      // 開催予定: startDate >= today OR startDate IS NULL
      conditions.push(sql`(${events.startDate} >= ${today} OR ${events.startDate} IS NULL)`);
    }
  }

  return db.query.events.findMany({
    where: and(...conditions),
    orderBy: (events, { desc }) => [desc(events.createdAt)],
    ...(options?.limit !== undefined && { limit: options.limit }),
    ...(options?.offset !== undefined && { offset: options.offset }),
  });
}

export async function countEvents(db: Database, orgId: string, options?: { visibility?: string; ended?: boolean }) {
  const conditions = [eq(events.organizationId, orgId)];
  if (options?.visibility) {
    conditions.push(eq(events.visibility, options.visibility));
  }
  if (options?.ended !== undefined) {
    const today = new Date().toISOString().split("T")[0];
    if (options.ended) {
      conditions.push(sql`${events.startDate} IS NOT NULL`);
      conditions.push(lt(events.startDate, today));
    } else {
      conditions.push(sql`(${events.startDate} >= ${today} OR ${events.startDate} IS NULL)`);
    }
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
    participationRequirements?: string;
    recommendedFor?: string;
    participationBenefits?: string;
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
    participationRequirements: string | null;
    recommendedFor: string | null;
    participationBenefits: string | null;
    registrationDeadline: string | null;
    reminderEnabled: number;
    reminderDays: string;
    reminderSubject: string | null;
    reminderBody: string | null;
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

export async function getPublicEvents(
  db: Database,
  options?: { month?: "current" | "next"; eventType?: string; q?: string },
) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const conditions = [
    eq(events.visibility, "public"),
    eq(events.status, "active"),
    gte(events.startDate, today),
  ];

  if (options?.eventType) {
    conditions.push(eq(events.eventType, options.eventType));
  }

  if (options?.q) {
    conditions.push(like(events.title, `%${options.q}%`));
  }

  if (options?.month) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (options.month === "next") {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    const startOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonth = month + 1 > 11 ? 0 : month + 1;
    const nextYear = month + 1 > 11 ? year + 1 : year;
    const endOfMonth = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;

    conditions.push(gte(events.startDate, startOfMonth));
    conditions.push(sql`${events.startDate} < ${endOfMonth}`);
  }

  return db.query.events.findMany({
    where: and(...conditions),
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
    notificationConsent?: number;
    requestedDate?: string;
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
        ...(data.notificationConsent !== undefined && { notificationConsent: data.notificationConsent }),
        ...(data.requestedDate !== undefined && { requestedDate: data.requestedDate }),
      },
    })
    .returning();
  return registration;
}
