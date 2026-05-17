'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDbFromContext } from '@/lib/db'
import { createSurveyResponse, incrementSurveyResponseCount } from '@/lib/db/queries/surveys'
import { upsertCustomerByEmail } from '@/lib/db/queries/customers'
import { surveys, eventRegistrations, events } from '@/lib/db/schema'

export async function submitSurveyResponse(
  surveyId: string,
  organizationId: string,
  respondentName: string,
  respondentEmail: string,
  answers: Record<string, unknown>
): Promise<{ error?: string }> {
  const db = getDbFromContext()

  try {
    // アンケート情報を取得
    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, surveyId),
      columns: { category: true, eventId: true, organizationId: true, deadline: true, isAnonymous: true },
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

    await createSurveyResponse(db, {
      surveyId,
      organizationId,
      customerId,
      respondentName: respondentName || undefined,
      respondentEmail: respondentEmail || undefined,
      answers,
    })

    // response_count をインクリメント
    await incrementSurveyResponseCount(db, surveyId)

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

    return {}
  } catch {
    return { error: '送信に失敗しました。もう一度お試しください' }
  }
}
