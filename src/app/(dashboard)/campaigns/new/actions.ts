'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { createCampaign } from '@/lib/db/queries/campaigns'
import { getTags } from '@/lib/db/queries/tags'
import { getCustomers } from '@/lib/db/queries/customers'
import { customerTags, customers } from '@/lib/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
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

export async function getCustomersByTarget(
  targetType: string,
  tagIds: string[],
): Promise<{
  customers: { id: string; fullName: string | null; email: string; tags: { name: string; color: string }[] }[]
  total: number
}> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { customers: [], total: 0 }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { customers: [], total: 0 }

  const orgId = profile.currentOrganizationId

  if (targetType === 'tag' && tagIds.length > 0) {
    // タグ指定: 選択タグに紐づく顧客を取得
    const taggedCustomerRows = await db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(inArray(customerTags.tagId, tagIds))

    const customerIds = [...new Set(taggedCustomerRows.map(r => r.customerId))]
    if (customerIds.length === 0) return { customers: [], total: 0 }

    const total = customerIds.length
    // 最初の50件だけ詳細取得
    const limitedIds = customerIds.slice(0, 50)

    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.id, limitedIds),
      ),
      with: {
        customerTags: {
          with: { tag: true },
        },
      },
    })

    return {
      customers: results.map(c => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        tags: (c.customerTags ?? []).map((ct: any) => ({ name: ct.tag.name, color: ct.tag.color })),
      })),
      total,
    }
  }

  // 全顧客
  const allCustomers = await getCustomers(db, orgId, { limit: 51, withTags: true })
  const limited = allCustomers.slice(0, 50)

  // 全件数を取得
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.organizationId, orgId))

  const total = countRow?.count ?? limited.length

  return {
    customers: limited.map((c: any) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      tags: (c.customerTags ?? []).map((ct: any) => ({ name: ct.tag.name, color: ct.tag.color })),
    })),
    total,
  }
}
