'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDbFromContext } from '@/lib/db'
import { createSurveyResponse, incrementSurveyResponseCount } from '@/lib/db/queries/surveys'
import { upsertCustomerByEmail } from '@/lib/db/queries/customers'
import { surveys, eventRegistrations, events, workshopContents, contentAccessTokens } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'

export async function submitSurveyResponse(
  surveyId: string,
  organizationId: string,
  respondentName: string,
  respondentEmail: string,
  answers: Record<string, unknown>
): Promise<{ error?: string; contentUrl?: string }> {
  const db = getDbFromContext()

  try {
    // アンケート情報を取得
    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, surveyId),
      columns: { category: true, eventId: true, organizationId: true, deadline: true, isAnonymous: true, completionEmailEnabled: true, completionEmailSubject: true, completionEmailBody: true },
    })

    // 期限チェック
    if (survey?.deadline && Math.floor(Date.now() / 1000) > survey.deadline) {
      return { error: 'このアンケートの回答期限を過ぎています' }
    }

    // 非匿名アンケートではメールアドレス必須
    if (survey && !survey.isAnonymous && !respondentEmail?.trim()) {
      return { error: 'メールアドレスは必須です' }
    }

    // respondentEmail があれば全カテゴリで顧客レコードを upsert
    let customerId: string | undefined
    if (respondentEmail) {
      const customer = await upsertCustomerByEmail(db, organizationId, {
        email: respondentEmail,
        fullName: respondentName || undefined,
        source: 'survey',
        sourceEventId: survey?.eventId || undefined,
      })
      customerId = customer.id
    }

    const surveyResponse = await createSurveyResponse(db, {
      surveyId,
      organizationId,
      customerId,
      respondentName: respondentName || undefined,
      respondentEmail: respondentEmail || undefined,
      answers,
    })

    // response_count をインクリメント
    await incrementSurveyResponseCount(db, surveyId)

    // コンテンツアクセストークン生成（イベントにワークショップコンテンツがある場合）
    let contentUrl = ''
    if (survey?.eventId) {
      try {
        const hasContents = await db.query.workshopContents.findFirst({
          where: eq(workshopContents.eventId, survey.eventId),
          columns: { id: true },
        })
        if (hasContents) {
          const token = crypto.randomUUID()
          await db.insert(contentAccessTokens).values({
            eventId: survey.eventId,
            surveyResponseId: surveyResponse.id,
            customerId: customerId || null,
            token,
          })
          contentUrl = `https://seminar-crm.foritemaqua.workers.dev/contents/${token}`
        }
      } catch {
        // トークン生成失敗は回答登録に影響させない
      }
    }

    // 完了メール送信（有効化されている場合のみ）
    if (survey?.completionEmailEnabled && survey.completionEmailBody && respondentEmail) {
      try {
        let eventData: { title: string; startDate?: string | null; location?: string | null; onlineUrl?: string | null } | undefined
        if (survey.eventId) {
          const event = await db.query.events.findFirst({
            where: eq(events.id, survey.eventId),
            columns: { title: true, startDate: true, location: true, onlineUrl: true },
          })
          if (event) eventData = event
        }
        const subject = replaceEmailPlaceholders(
          survey.completionEmailSubject || 'ご回答ありがとうございます',
          { name: respondentName, email: respondentEmail, event: eventData, contentUrl }
        )
        const body = replaceEmailPlaceholders(
          survey.completionEmailBody,
          { name: respondentName, email: respondentEmail, event: eventData, contentUrl }
        )
        await sendEmail(respondentEmail, subject, body, 'text')
      } catch {
        // メール送信失敗は回答登録に影響させない
      }
    }

    // category=registration かつ eventId がある場合、参加者登録を行う
    if (
      survey?.category === 'registration' &&
      survey.eventId &&
      respondentEmail &&
      customerId
    ) {
      const eventId = survey.eventId

      // event_registrations テーブルで重複チェック
      const existingReg = await db.query.eventRegistrations.findFirst({
        where: (r, { and, eq: colEq }) =>
          and(colEq(r.eventId, eventId), colEq(r.email, respondentEmail)),
        columns: { id: true },
      })

      if (!existingReg) {
        // 新規参加者登録
        await db.insert(eventRegistrations).values({
          eventId,
          customerId,
          organizationId: survey.organizationId,
          email: respondentEmail,
          fullName: respondentName || undefined,
          status: 'registered',
        })

        // events.registrationCount をインクリメント
        await db
          .update(events)
          .set({
            registrationCount: sql`coalesce(${events.registrationCount}, 0) + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(events.id, eventId))

        revalidatePath('/events')
        revalidatePath(`/events/${eventId}`)
      }
    }

    return { contentUrl: contentUrl || undefined }
  } catch {
    return { error: '送信に失敗しました。もう一度お試しください' }
  }
}

function replaceEmailPlaceholders(
  template: string,
  context: { name: string; email: string; event?: { title: string; startDate?: string | null; location?: string | null; onlineUrl?: string | null }; contentUrl?: string }
): string {
  return template
    .replace(/\{\{name\}\}/g, context.name || '')
    .replace(/\{\{email\}\}/g, context.email || '')
    .replace(/\{\{event_title\}\}/g, context.event?.title || '')
    .replace(/\{\{event_date\}\}/g, context.event?.startDate || '')
    .replace(/\{\{event_location\}\}/g, context.event?.location || '')
    .replace(/\{\{online_url\}\}/g, context.event?.onlineUrl || '')
    .replace(/\{\{content_url\}\}/g, context.contentUrl || '')
}
