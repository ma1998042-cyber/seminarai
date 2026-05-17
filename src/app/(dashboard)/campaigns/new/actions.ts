'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { createCampaign } from '@/lib/db/queries/campaigns'
import { getTags } from '@/lib/db/queries/tags'
import { getCustomers } from '@/lib/db/queries/customers'
import { customerTags, customers, emailTemplates, surveyResponses, surveys } from '@/lib/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { sendCampaignEmails } from '@/lib/email/send-campaign'

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
  target_survey_id: string
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
    targetSurveyId: form.target_survey_id || null,
    status: form.status,
    scheduledAt: form.scheduled_at || undefined,
    createdBy: user.id,
  })

  if (!campaign) return { error: 'メルマガの作成に失敗しました' }

  revalidatePath('/campaigns')
  return { campaignId: campaign.id }
}

export async function sendNowAction(form: {
  title: string
  subject: string
  preview_text: string
  body_html: string
  target_type: string
  target_tag_ids: string[]
  target_survey_id: string
}): Promise<{ campaignId?: string; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  // status='sending' で作成
  const campaign = await createCampaign(db, {
    organizationId: profile.currentOrganizationId,
    title: form.title,
    subject: form.subject,
    previewText: form.preview_text || undefined,
    bodyHtml: form.body_html,
    targetType: form.target_type,
    targetTagIds: form.target_tag_ids.length > 0 ? form.target_tag_ids : null,
    targetSurveyId: form.target_survey_id || null,
    status: 'sending',
    createdBy: user.id,
  })

  if (!campaign) return { error: 'メルマガの作成に失敗しました' }

  // 即時送信を実行
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const baseUrl = `${protocol}://${host}`

  try {
    await sendCampaignEmails(db, campaign.id, baseUrl)
  } catch (err) {
    console.error('即時送信エラー:', err)
    // 送信に失敗してもキャンペーン自体は作成済み
  }

  revalidatePath('/campaigns')
  return { campaignId: campaign.id }
}

export async function getSurveysForOrg(): Promise<{ id: string; title: string; category: string; responseCount: number }[]> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return []

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return []

  const results = await db.query.surveys.findMany({
    where: eq(surveys.organizationId, profile.currentOrganizationId),
    columns: { id: true, title: true, category: true, responseCount: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  })
  return results
}

export async function getCustomersByTarget(
  targetType: string,
  tagIds: string[],
  surveyId?: string,
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

  if (targetType === 'survey_respondents' && surveyId) {
    // アンケート回答者: respondentEmail から顧客を検索
    const responses = await db
      .select({ email: surveyResponses.respondentEmail, name: surveyResponses.respondentName })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))

    const uniqueEmails = [...new Set(responses.filter(r => r.email).map(r => r.email!))]
    if (uniqueEmails.length === 0) return { customers: [], total: 0 }

    const total = uniqueEmails.length
    const limitedEmails = uniqueEmails.slice(0, 50)

    // 顧客テーブルに存在するものを取得
    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, limitedEmails),
      ),
      with: {
        customerTags: {
          with: { tag: true },
        },
      },
    })

    // 顧客テーブルにない回答者も含める
    const existingEmails = new Set(results.map(c => c.email))
    const nonCustomerRespondents = responses
      .filter(r => r.email && !existingEmails.has(r.email))
      .slice(0, 50 - results.length)

    const allResults = [
      ...results.map(c => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        tags: (c.customerTags ?? []).map((ct: any) => ({ name: ct.tag.name, color: ct.tag.color })),
      })),
      ...nonCustomerRespondents.map(r => ({
        id: r.email!,
        fullName: r.name,
        email: r.email!,
        tags: [],
      })),
    ]

    return { customers: allResults, total }
  }

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

export async function getTemplatesForOrg(): Promise<{ id: string; name: string; subject: string; previewText: string | null; bodyHtml: string }[]> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return []

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return []

  const templates = await db.query.emailTemplates.findMany({
    where: eq(emailTemplates.organizationId, profile.currentOrganizationId),
    columns: { id: true, name: true, subject: true, previewText: true, bodyHtml: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
  return templates
}
