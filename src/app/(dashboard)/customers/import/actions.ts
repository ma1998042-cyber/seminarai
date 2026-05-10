'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.current_organization_id
  if (!orgId) return { error: '組織が設定されていません' }

  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_type, start_date, status')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return { orgId, events: events ?? [] }
}

export async function importCustomers(options: ImportOptions) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.current_organization_id
  if (!orgId) return { error: '組織が設定されていません' }

  const admin = await createAdminClient()

  let targetEventId: string | null = null

  // イベント作成
  if (options.eventMode === 'new' && options.newEventTitle) {
    const { data: newEvent, error: eventErr } = await admin
      .from('events')
      .insert({
        organization_id: orgId,
        title: options.newEventTitle,
        event_type: options.newEventType ?? 'seminar',
        status: 'active',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (eventErr || !newEvent) {
      return { error: `イベントの作成に失敗しました: ${eventErr?.message}` }
    }
    targetEventId = newEvent.id
  } else if (options.eventMode === 'existing' && options.eventId) {
    targetEventId = options.eventId
  }

  let imported = 0
  let skipped = 0

  for (const row of options.customers) {
    if (!row.email?.trim()) { skipped++; continue }

    const { data: customer, error: custErr } = await admin
      .from('customers')
      .upsert(
        {
          organization_id: orgId,
          email: row.email.trim().toLowerCase(),
          full_name: row.full_name?.trim() || null,
          phone: row.phone?.trim() || null,
          company: row.company?.trim() || null,
          job_title: row.job_title?.trim() || null,
          source: 'import',
          source_event_id: targetEventId,
        },
        { onConflict: 'organization_id,email', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (custErr || !customer) { skipped++; continue }

    // イベント参加者として登録
    if (targetEventId) {
      await admin.from('event_registrations').upsert(
        {
          event_id: targetEventId,
          customer_id: customer.id,
          organization_id: orgId,
          email: row.email.trim().toLowerCase(),
          full_name: row.full_name?.trim() || null,
          status: 'registered',
        },
        { onConflict: 'event_id,email', ignoreDuplicates: true }
      )
    }

    imported++
  }

  return { imported, skipped, eventId: targetEventId }
}
