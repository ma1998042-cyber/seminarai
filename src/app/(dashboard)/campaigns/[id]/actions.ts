'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { getCampaignById, updateCampaign as updateCampaignQuery, deleteCampaign as deleteCampaignQuery } from '@/lib/db/queries/campaigns'
import { getTags } from '@/lib/db/queries/tags'
import { customerTags, customers, emailSends, surveyResponses, surveys, emailCampaigns } from '@/lib/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

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

  return {
    ...campaign,
    targetTagNames,
    targetSurveyName,
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

      let sentCount = 0
      for (const recipient of emails) {
        try {
          await sendEmail(recipient.email, form.subject, form.body_html)
          await ctx.db.insert(emailSends).values({
            campaignId: id,
            organizationId: ctx.orgId,
            customerId: recipient.customerId,
            email: recipient.email,
            status: 'sent',
            sentAt: new Date().toISOString(),
          })
          sentCount++
        } catch {
          await ctx.db.insert(emailSends).values({
            campaignId: id,
            organizationId: ctx.orgId,
            customerId: recipient.customerId,
            email: recipient.email,
            status: 'failed',
            errorMessage: 'メール送信に失敗しました',
          })
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
