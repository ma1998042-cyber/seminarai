'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'

export async function createOrganization(orgName: string, orgType: string) {
  // ユーザー認証確認（通常クライアント）
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  // DB操作はService Role（RLSバイパス）で実行
  const admin = await createAdminClient()

  const slug = generateSlug(orgName)
  const { data: plan } = await admin.from('plans').select('id').eq('name', 'free').single()

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name: orgName,
      slug,
      settings: { business_type: orgType },
      plan_id: plan?.id ?? null,
    })
    .select()
    .single()

  if (orgErr || !org) {
    return { error: `${orgErr?.message} (code: ${orgErr?.code})` }
  }

  await admin.from('organization_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'owner',
    joined_at: new Date().toISOString(),
  })

  await admin.from('user_profiles').upsert({
    id: user.id,
    current_organization_id: org.id,
  })

  return { orgId: org.id }
}

export async function createEvent(orgId: string, eventTitle: string, eventType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()
  const { error } = await admin.from('events').insert({
    organization_id: orgId,
    title: eventTitle,
    event_type: eventType,
    status: 'draft',
    created_by: user.id,
  })

  if (error) return { error: error.message }
  return {}
}

export async function completeOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()
  await admin.from('user_profiles').upsert({
    id: user.id,
    onboarding_completed: true,
  })

  return {}
}
