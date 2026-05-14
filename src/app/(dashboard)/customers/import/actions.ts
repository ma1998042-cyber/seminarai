'use server'

import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { getEvents, createEvent } from '@/lib/db/queries/events'
import { upsertCustomerByEmail } from '@/lib/db/queries/customers'
import { upsertEventRegistration } from '@/lib/db/queries/events'
import { headers } from 'next/headers'

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
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が設定されていません' }

  const events = await getEvents(db, orgId)

  return {
    orgId,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      event_type: e.eventType,
      status: e.status,
    })),
  }
}

export async function importCustomers(options: ImportOptions) {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が設定されていません' }

  let targetEventId: string | null = null

  // イベント作成
  if (options.eventMode === 'new' && options.newEventTitle) {
    try {
      const newEvent = await createEvent(db, {
        organizationId: orgId,
        title: options.newEventTitle,
        eventType: options.newEventType ?? 'seminar',
        status: 'active',
        createdBy: user.id,
      })
      targetEventId = newEvent.id
    } catch (e: any) {
      return { error: `イベントの作成に失敗しました: ${e.message}` }
    }
  } else if (options.eventMode === 'existing' && options.eventId) {
    targetEventId = options.eventId
  }

  let imported = 0
  let skipped = 0

  for (const row of options.customers) {
    if (!row.email?.trim()) { skipped++; continue }

    try {
      const customer = await upsertCustomerByEmail(db, orgId, {
        email: row.email.trim().toLowerCase(),
        fullName: row.full_name?.trim() || undefined,
        phone: row.phone?.trim() || undefined,
        company: row.company?.trim() || undefined,
        jobTitle: row.job_title?.trim() || undefined,
        source: 'import',
        sourceEventId: targetEventId ?? undefined,
      })

      // イベント参加者として登録
      if (targetEventId && customer) {
        try {
          await upsertEventRegistration(db, {
            eventId: targetEventId,
            customerId: customer.id,
            organizationId: orgId,
            email: row.email.trim().toLowerCase(),
            fullName: row.full_name?.trim() || undefined,
            status: 'registered',
          })
        } catch {
          // ignore duplicate registration
        }
      }

      imported++
    } catch {
      skipped++
    }
  }

  return { imported, skipped, eventId: targetEventId }
}
