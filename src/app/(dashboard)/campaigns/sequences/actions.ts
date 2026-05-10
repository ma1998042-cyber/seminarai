'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getOrgId(userId: string) {
  const admin = await createAdminClient()
  const { data } = await admin.from('user_profiles').select('current_organization_id').eq('id', userId).single()
  return data?.current_organization_id ?? null
}

export async function saveSequence(data: {
  id?: string
  name: string
  description?: string
  trigger_type: string
  trigger_event_id?: string
  trigger_tag_id?: string
}) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const admin = await createAdminClient()
  const payload = {
    name: data.name,
    description: data.description || null,
    trigger_type: data.trigger_type,
    trigger_event_id: data.trigger_event_id || null,
    trigger_tag_id: data.trigger_tag_id || null,
  }

  if (data.id) {
    const { error } = await admin.from('step_campaigns').update(payload).eq('id', data.id).eq('organization_id', orgId)
    if (error) return { error: error.message }
    return { id: data.id }
  } else {
    const { data: seq, error } = await admin.from('step_campaigns').insert({
      ...payload, organization_id: orgId, created_by: user.id,
    }).select('id').single()
    if (error || !seq) return { error: error?.message ?? '作成に失敗しました' }
    return { id: seq.id }
  }
}

export async function updateSequenceStatus(id: string, status: string) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const admin = await createAdminClient()
  const { error } = await admin.from('step_campaigns').update({ status }).eq('id', id).eq('organization_id', orgId)
  if (error) return { error: error.message }
  return {}
}

export async function saveStep(data: {
  id?: string
  step_campaign_id: string
  step_number: number
  name?: string
  delay_days: number
  subject: string
  preview_text?: string
  body_html: string
}) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()
  const payload = {
    step_campaign_id: data.step_campaign_id,
    step_number: data.step_number,
    name: data.name || null,
    delay_days: data.delay_days,
    subject: data.subject,
    preview_text: data.preview_text || null,
    body_html: data.body_html,
  }

  if (data.id) {
    const { error } = await admin.from('step_campaign_steps').update(payload).eq('id', data.id)
    if (error) return { error: error.message }
    return { id: data.id }
  } else {
    const { data: step, error } = await admin.from('step_campaign_steps').insert(payload).select('id').single()
    if (error || !step) return { error: error?.message ?? '作成に失敗しました' }
    return { id: step.id }
  }
}

export async function deleteStep(id: string) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()
  const { error } = await admin.from('step_campaign_steps').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function enrollCustomers(sequenceId: string, customerIds: string[]) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const admin = await createAdminClient()
  const rows = customerIds.map(cid => ({
    step_campaign_id: sequenceId,
    customer_id: cid,
    organization_id: orgId,
    status: 'active',
    current_step: 0,
  }))
  const { error } = await admin.from('step_campaign_enrollments').upsert(rows, { onConflict: 'step_campaign_id,customer_id', ignoreDuplicates: true })
  if (error) return { error: error.message }
  return { enrolled: rows.length }
}
