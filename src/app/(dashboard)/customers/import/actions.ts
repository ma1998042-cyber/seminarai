'use server'

import { getDb, customers, events, eventRegistrations } from '@/lib/db'
import { getCurrentUser, getCurrentOrgId } from '@/lib/session'
import { eq, and } from 'drizzle-orm'

type CustomerRow = {
  email: string
  full_name?: string
  phone?: string
  company?: string
  job_title?: string
}

type ImportOptions = {
  customers: CustomerRow[]
  eventMode: 'existing' | 'new' | 'none'
  eventId?: string
  newEventTitle?: string
  newEventType?: string
}

export async function getOrgAndEvents() {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()
  const eventRows = await db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      startDate: events.startDate,
      status: events.status,
    })
    .from(events)
    .where(eq(events.organizationId, orgId))
    .orderBy(events.createdAt)

  return { orgId, events: eventRows }
}

export async function importCustomers(options: ImportOptions) {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()

  let targetEventId: string | null = null

  if (options.eventMode === 'new' && options.newEventTitle) {
    const newEvent = await db
      .insert(events)
      .values({
        organizationId: orgId,
        title: options.newEventTitle,
        eventType: options.newEventType ?? 'seminar',
        status: 'active',
        createdBy: user.id,
      })
      .returning()
      .get()

    if (!newEvent) return { error: 'イベントの作成に失敗しました' }
    targetEventId = newEvent.id
  } else if (options.eventMode === 'existing' && options.eventId) {
    targetEventId = options.eventId
  }

  let imported = 0
  let skipped = 0

  for (const row of options.customers) {
    if (!row.email?.trim()) { skipped++; continue }

    const email = row.email.trim().toLowerCase()

    const customer = await db
      .insert(customers)
      .values({
        organizationId: orgId,
        email,
        fullName: row.full_name?.trim() || null,
        phone: row.phone?.trim() || null,
        company: row.company?.trim() || null,
        jobTitle: row.job_title?.trim() || null,
        source: 'import',
        sourceEventId: targetEventId,
      })
      .onConflictDoUpdate({
        target: [customers.organizationId, customers.email],
        set: {
          fullName: row.full_name?.trim() || null,
          phone: row.phone?.trim() || null,
          company: row.company?.trim() || null,
          jobTitle: row.job_title?.trim() || null,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning()
      .get()

    if (!customer) { skipped++; continue }

    if (targetEventId) {
      await db
        .insert(eventRegistrations)
        .values({
          eventId: targetEventId,
          customerId: customer.id,
          organizationId: orgId,
          email,
          fullName: row.full_name?.trim() || null,
          status: 'registered',
        })
        .onConflictDoNothing()
    }

    imported++
  }

  return { imported, skipped, eventId: targetEventId }
}
