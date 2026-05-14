'use server'

import { getDb, events, customers, eventRegistrations } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function registerForEvent(
  eventId: string,
  fullName: string,
  email: string
): Promise<{ error?: string }> {
  const db = getDb()

  const event = await db
    .select({ organizationId: events.organizationId, capacity: events.capacity, registrationCount: events.registrationCount })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.status, 'active')))
    .get()

  if (!event) return { error: 'イベントが見つかりません' }

  if (event.capacity != null && event.registrationCount >= event.capacity) {
    return { error: 'このイベントは定員に達しています' }
  }

  const normalizedEmail = email.trim().toLowerCase()

  // 顧客を upsert
  const customer = await db
    .insert(customers)
    .values({
      organizationId: event.organizationId,
      email: normalizedEmail,
      fullName: fullName.trim() || null,
      source: 'event',
      sourceEventId: eventId,
    })
    .onConflictDoUpdate({
      target: [customers.organizationId, customers.email],
      set: {
        fullName: fullName.trim() || null,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning()
    .get()

  // 参加者登録
  const existing = await db
    .select({ id: eventRegistrations.id })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.email, normalizedEmail)))
    .get()

  if (existing) return { error: 'このメールアドレスは既に申し込み済みです' }

  await db.insert(eventRegistrations).values({
    eventId,
    customerId: customer?.id ?? null,
    organizationId: event.organizationId,
    email: normalizedEmail,
    fullName: fullName.trim() || null,
    status: 'registered',
  })

  await db
    .update(events)
    .set({ registrationCount: sql`${events.registrationCount} + 1` })
    .where(eq(events.id, eventId))

  return {}
}
