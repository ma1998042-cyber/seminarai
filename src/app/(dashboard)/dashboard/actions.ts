'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function createOrganizationFromDashboard(orgName: string, orgType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

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
    .select('id')
    .single()

  if (orgErr || !org) return { error: orgErr?.message ?? '組織の作成に失敗しました' }

  await admin.from('organization_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'owner',
    joined_at: new Date().toISOString(),
  })

  await admin.from('user_profiles').upsert({
    id: user.id,
    current_organization_id: org.id,
    onboarding_completed: true,
  })

  revalidatePath('/dashboard')
  return { orgId: org.id }
}
