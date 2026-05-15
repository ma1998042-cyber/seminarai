'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { getCampaignById, updateCampaign as updateCampaignQuery, deleteCampaign as deleteCampaignQuery } from '@/lib/db/queries/campaigns'
import { getCustomers } from '@/lib/db/queries/customers'
import { getTags } from '@/lib/db/queries/tags'
import { customerTags, customers, emailSends, surveyResponses, surveys, emailCampaigns } from '@/lib/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { addTrackingPixel, rewriteLinks } from '@/lib/email/tracking'

async function getSessionAndOrg() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return null

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return null

  return { user, db, orgId: profile.currentOrganizationId }
}

export async function getCampaignDetail(id: string) {
  const ctx = await getSessionAndOrg()
  if (!ctx) return null

  const campaign = await getCampaignById(ctx.db, ctx.orgId, id)
  if (!campaign) return null

  // タグ名を解決
  let targetTagNames: { id: string; name: string; color: string }[] = []
  if (campaign.targetType === 'tag' && campaign.targetTagIds && campaign.targetTagIds.length > 0) {
    const allTags = await getTags(ctx.db, ctx.orgId)
    targetTagNames = allTags
      .filter(t => campaign.targetTagIds!.includes(t.id))
      .map(t => ({ id: t.id, name: t.name, color: t.color }))
  }

  // アンケート名を解決
  let targetSurveyName: string | null = null
  if (campaign.targetType === 'survey_respondents' && campaign.targetSurveyId) {
    const survey = await ctx.db.query.surveys.findFirst({
      where: eq(surveys.id, campaign.targetSurveyId),
      columns: { title: true },
    })
    targetSurveyName = survey?.title ?? null
  }

  // email_sends から開封数・クリック数を集計
  const [openCountRow] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.campaignId, id),
        sql`${emailSends.openedAt} is not null`,
      ),
    )
  const [clickCountRow] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.campaignId, id),
        sql`${emailSends.clickedAt} is not null`,
      ),
    )

  return {
    ...campaign,
    targetTagNames,
    targetSurveyName,
    openCount: openCountRow?.count ?? 0,
    clickCount: clickCountRow?.count ?? 0,
  }
}

export async function getTagsForOrg(): Promise<{ id: string; name: string; color: string }[]> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return []

  const tags = await getTags(ctx.db, ctx.orgId)
  return tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
}

export async function getSurveysForOrg(): Promise<{ id: string; title: string; category: string; responseCount: number }[]> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return []

  return ctx.db.query.surveys.findMany({
    where: eq(surveys.organizationId, ctx.orgId),
    columns: { id: true, title: true, category: true, responseCount: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  })
}

export async function updateCampaignAction(
  id: string,
  form: {
    title: string
    subject: string
    preview_text: string
    body_html: string
    target_type: string
    target_tag_ids: string[]
    target_survey_id: string
    scheduled_at: string
    action: 'save' | 'schedule' | 'send'
  },
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return { error: 'ログインが必要です' }

  const campaign = await getCampaignById(ctx.db, ctx.orgId, id)
  if (!campaign) return { error: 'キャンペーンが見つかりません' }
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return { error: 'このキャンペーンは編集できません' }
  }

  let status = campaign.status
  if (form.action === 'save') {
    status = 'draft'
  } else if (form.action === 'schedule') {
    if (!form.scheduled_at) return { error: '予約配信日時を指定してください' }
    status = 'scheduled'
  } else if (form.action === 'send') {
    status = 'sending'
  }

  await updateCampaignQuery(ctx.db, ctx.orgId, id, {
    title: form.title,
    subject: form.subject,
    previewText: form.preview_text || null,
    bodyHtml: form.body_html,
    targetType: form.target_type,
    targetTagIds: form.target_tag_ids.length > 0 ? form.target_tag_ids : null,
    targetSurveyId: form.target_survey_id || null,
    scheduledAt: form.action === 'schedule' ? form.scheduled_at : null,
    status,
  })

  // 即時送信
  if (form.action === 'send') {
    try {
      const emails = await resolveTargetEmails(ctx.db, ctx.orgId, form.target_type, form.target_tag_ids, form.target_survey_id)
      if (emails.length === 0) {
        await updateCampaignQuery(ctx.db, ctx.orgId, id, { status: 'draft' })
        return { error: '配信対象の顧客が見つかりません' }
      }

      // baseUrl をヘッダーから取得
      const hdrs = await headers()
      const host = hdrs.get('host') || 'localhost:3000'
      const proto = hdrs.get('x-forwarded-proto') || 'https'
      const baseUrl = `${proto}://${host}`

      let sentCount = 0
      for (const recipient of emails) {
        try {
          // 先に pending で insert して id を取得
          const sendRecord = await ctx.db
            .insert(emailSends)
            .values({
              campaignId: id,
              organizationId: ctx.orgId,
              customerId: recipient.customerId,
              email: recipient.email,
              status: 'pending',
            })
            .returning({ id: emailSends.id })

          const sendId = sendRecord[0].id

          // トラッキング付きHTMLを生成
          let trackedHtml = addTrackingPixel(form.body_html, sendId, baseUrl)
          trackedHtml = rewriteLinks(trackedHtml, sendId, baseUrl)

          await sendEmail(recipient.email, form.subject, trackedHtml)

          // 成功 → sent に更新
          await ctx.db
            .update(emailSends)
            .set({ status: 'sent', sentAt: new Date().toISOString() })
            .where(eq(emailSends.id, sendId))
          sentCount++
        } catch {
          // pending が既に入っている場合もあるため insert を試みる
          try {
            await ctx.db.insert(emailSends).values({
              campaignId: id,
              organizationId: ctx.orgId,
              customerId: recipient.customerId,
              email: recipient.email,
              status: 'failed',
              errorMessage: 'メール送信に失敗しました',
            })
          } catch {
            // pending レコードが既に存在する場合は無視
          }
        }
      }

      await updateCampaignQuery(ctx.db, ctx.orgId, id, {
        status: 'sent',
        sentAt: new Date().toISOString(),
        totalRecipients: emails.length,
        sentCount,
      })
    } catch {
      await updateCampaignQuery(ctx.db, ctx.orgId, id, { status: 'draft' })
      return { error: 'メール送信中にエラーが発生しました' }
    }
  }

  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${id}`)
  return { success: true }
}

export async function deleteCampaignAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return { error: 'ログインが必要です' }

  const deleted = await deleteCampaignQuery(ctx.db, ctx.orgId, id)
  if (!deleted) return { error: '削除できるのは下書きまたはキャンセル済みのキャンペーンのみです' }

  revalidatePath('/campaigns')
  return { success: true }
}

export async function cancelCampaignAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return { error: 'ログインが必要です' }

  const campaign = await getCampaignById(ctx.db, ctx.orgId, id)
  if (!campaign) return { error: 'キャンペーンが見つかりません' }
  if (campaign.status !== 'scheduled') return { error: '予約済みのキャンペーンのみキャンセルできます' }

  await updateCampaignQuery(ctx.db, ctx.orgId, id, {
    status: 'canceled',
    scheduledAt: null,
  })

  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${id}`)
  return { success: true }
}

// ターゲット解決: new/actions.ts の getCustomersByTarget と同等ロジック
async function resolveTargetEmails(
  db: any,
  orgId: string,
  targetType: string,
  tagIds: string[],
  surveyId?: string,
): Promise<{ email: string; customerId: string | null }[]> {
  if (targetType === 'survey_respondents' && surveyId) {
    const responses = await db
      .select({ email: surveyResponses.respondentEmail, name: surveyResponses.respondentName })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))

    const uniqueEmails = [...new Set(responses.filter((r: any) => r.email).map((r: any) => r.email!))] as string[]
    if (uniqueEmails.length === 0) return []

    // 顧客テーブルとマッチング
    const existingCustomers = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, uniqueEmails),
      ),
      columns: { id: true, email: true },
    })

    const customerMap = new Map<string, string>(existingCustomers.map((c: any) => [c.email, c.id]))
    return uniqueEmails.map(email => ({
      email,
      customerId: customerMap.get(email) ?? null,
    }))
  }

  if (targetType === 'tag' && tagIds.length > 0) {
    const taggedCustomerRows = await db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(inArray(customerTags.tagId, tagIds))

    const customerIds = [...new Set(taggedCustomerRows.map((r: any) => r.customerId))] as string[]
    if (customerIds.length === 0) return []

    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.id, customerIds),
      ),
      columns: { id: true, email: true },
    })

    return results.map((c: any) => ({ email: c.email, customerId: c.id }))
  }

  // 全顧客
  const allCustomers = await db.query.customers.findMany({
    where: eq(customers.organizationId, orgId),
    columns: { id: true, email: true },
  })

  return allCustomers.map((c: any) => ({ email: c.email, customerId: c.id }))
}

export async function getCustomersByTarget(
  targetType: string,
  tagIds: string[],
  surveyId?: string,
): Promise<{
  customers: { id: string; fullName: string | null; email: string; tags: { name: string; color: string }[] }[]
  total: number
}> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return { customers: [], total: 0 }

  const { db, orgId } = ctx

  if (targetType === 'survey_respondents' && surveyId) {
    const responses = await db
      .select({ email: surveyResponses.respondentEmail, name: surveyResponses.respondentName })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))

    const uniqueEmails = [...new Set(responses.filter((r: any) => r.email).map((r: any) => r.email!))] as string[]
    if (uniqueEmails.length === 0) return { customers: [], total: 0 }

    const total = uniqueEmails.length
    const limitedEmails = uniqueEmails.slice(0, 50)

    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, limitedEmails),
      ),
      with: { customerTags: { with: { tag: true } } },
    })

    const existingEmails = new Set(results.map((c: any) => c.email))
    const nonCustomerRespondents = responses
      .filter((r: any) => r.email && !existingEmails.has(r.email))
      .slice(0, 50 - results.length)

    return {
      customers: [
        ...results.map((c: any) => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          tags: (c.customerTags ?? []).map((ct: any) => ({ name: ct.tag.name, color: ct.tag.color })),
        })),
        ...nonCustomerRespondents.map((r: any) => ({
          id: r.email!,
          fullName: r.name,
          email: r.email!,
          tags: [],
        })),
      ],
      total,
    }
  }

  if (targetType === 'tag' && tagIds.length > 0) {
    const taggedCustomerRows = await db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(inArray(customerTags.tagId, tagIds))

    const customerIds = [...new Set(taggedCustomerRows.map((r: any) => r.customerId))] as string[]
    if (customerIds.length === 0) return { customers: [], total: 0 }

    const total = customerIds.length
    const limitedIds = customerIds.slice(0, 50)

    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.id, limitedIds),
      ),
      with: { customerTags: { with: { tag: true } } },
    })

    return {
      customers: results.map((c: any) => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        tags: (c.customerTags ?? []).map((ct: any) => ({ name: ct.tag.name, color: ct.tag.color })),
      })),
      total,
    }
  }

  // 全顧客
  const allCustomersList = await getCustomers(db, orgId, { limit: 51, withTags: true })
  const limited = allCustomersList.slice(0, 50)

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

export async function getCampaignRecipients(campaignId: string): Promise<{
  recipients: { email: string; fullName: string | null; status: string; sentAt: string | null }[]
  total: number
}> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return { recipients: [], total: 0 }

  const sends = await ctx.db
    .select({
      email: emailSends.email,
      customerId: emailSends.customerId,
      status: emailSends.status,
      sentAt: emailSends.sentAt,
    })
    .from(emailSends)
    .where(and(
      eq(emailSends.campaignId, campaignId),
      eq(emailSends.organizationId, ctx.orgId),
    ))

  const total = sends.length

  // 顧客IDから名前を取得
  const customerIds = sends.filter((s: any) => s.customerId).map((s: any) => s.customerId!) as string[]
  let customerNameMap = new Map<string, string | null>()
  if (customerIds.length > 0) {
    const customerRows = await ctx.db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, ctx.orgId),
        inArray(customers.id, customerIds),
      ),
      columns: { id: true, fullName: true },
    })
    customerNameMap = new Map(customerRows.map((c: any) => [c.id, c.fullName]))
  }

  const recipients = sends.slice(0, 100).map((s: any) => ({
    email: s.email,
    fullName: s.customerId ? (customerNameMap.get(s.customerId) ?? null) : null,
    status: s.status,
    sentAt: s.sentAt,
  }))

  return { recipients, total }
}
