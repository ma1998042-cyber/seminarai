'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { createCampaign } from '@/lib/db/queries/campaigns'
import { getTags } from '@/lib/db/queries/tags'
import { revalidatePath } from 'next/cache'

export async function getTagsForOrg(): Promise<{ id: string; name: string; color: string }[]> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return []

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return []

  const tags = await getTags(db, profile.currentOrganizationId)
  return tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
}

export async function createCampaignAction(form: {
  title: string
  subject: string
  preview_text: string
  body_html: string
  target_type: string
  target_tag_ids: string[]
  scheduled_at: string
  status: 'draft' | 'scheduled'
}): Promise<{ campaignId?: string; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  const campaign = await createCampaign(db, {
    organizationId: profile.currentOrganizationId,
    title: form.title,
    subject: form.subject,
    previewText: form.preview_text || undefined,
    bodyHtml: form.body_html,
    targetType: form.target_type,
    targetTagIds: form.target_tag_ids.length > 0 ? form.target_tag_ids : null,
    status: form.status,
    scheduledAt: form.scheduled_at || undefined,
    createdBy: user.id,
  })

  if (!campaign) return { error: 'メルマガの作成に失敗しました' }

  revalidatePath('/campaigns')
  return { campaignId: campaign.id }
}
