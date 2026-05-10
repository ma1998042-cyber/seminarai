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

export async function saveTemplate(data: {
  id?: string
  name: string
  subject: string
  preview_text?: string
  body_html: string
}) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const admin = await createAdminClient()

  if (data.id) {
    const { error } = await admin.from('email_templates').update({
      name: data.name,
      subject: data.subject,
      preview_text: data.preview_text || null,
      body_html: data.body_html,
    }).eq('id', data.id).eq('organization_id', orgId)
    if (error) return { error: error.message }
    return { id: data.id }
  } else {
    const { data: tmpl, error } = await admin.from('email_templates').insert({
      organization_id: orgId,
      name: data.name,
      subject: data.subject,
      preview_text: data.preview_text || null,
      body_html: data.body_html,
      created_by: user.id,
    }).select('id').single()
    if (error || !tmpl) return { error: error?.message ?? '作成に失敗しました' }
    return { id: tmpl.id }
  }
}

export async function deleteTemplate(id: string) {
  const user = await getUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const admin = await createAdminClient()
  const { error } = await admin.from('email_templates').delete().eq('id', id).eq('organization_id', orgId)
  if (error) return { error: error.message }
  return {}
}
