'use server'

import { eq, sql } from 'drizzle-orm'
import { getDbFromContext } from '@/lib/db'
import { createSurveyResponse, incrementSurveyResponseCount } from '@/lib/db/queries/surveys'
import { surveys, customers, eventRegistrations, events } from '@/lib/db/schema'

export async function submitSurveyResponse(
  surveyId: string,
  organizationId: string,
  respondentName: string,
  respondentEmail: string,
  answers: Record<string, unknown>
): Promise<{ error?: string }> {
  const db = getDbFromContext()

  try {
    await createSurveyResponse(db, {
      surveyId,
      organizationId,
      respondentName: respondentName || undefined,
      respondentEmail: respondentEmail || undefined,
      answers,
    })

    // response_count をインクリメント
    await incrementSurveyResponseCount(db, surveyId)

    // category=registration の場合、参加者登録を行う
    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, surveyId),
      columns: { category: true, eventId: true, organizationId: true },
    })

    if (
      survey?.category === 'registration' &&
      survey.eventId &&
      respondentEmail
    ) {
      // customers テーブルに upsert
      const existingCustomer = await db.query.customers.findFirst({
        where: (c, { and, eq }) =>
          and(eq(c.organizationId, survey.organizationId), eq(c.email, respondentEmail)),
        columns: { id: true },
      })

      let customerId: string
      if (existingCustomer) {
        customerId = existingCustomer.id
        // 名前があれば更新
        if (respondentName) {
          await db
            .update(customers)
            .set({
              fullName: respondentName,
              lastActivityAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(customers.id, customerId))
        }
      } else {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            organizationId: survey.organizationId,
            email: respondentEmail,
            fullName: respondentName || undefined,
            source: 'survey',
            sourceEventId: survey.eventId,
            lastActivityAt: new Date().toISOString(),
          })
          .returning()
        customerId = newCustomer.id
      }

      // event_registrations テーブルに upsert
      const existingReg = await db.query.eventRegistrations.findFirst({
        where: (r, { and, eq }) =>
          and(eq(r.eventId, survey.eventId!), eq(r.email, respondentEmail)),
        columns: { id: true },
      })

      if (!existingReg) {
        await db.insert(eventRegistrations).values({
          eventId: survey.eventId,
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
            registrationCount: sql`${events.registrationCount} + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(events.id, survey.eventId))
      }
    }

    return {}
  } catch {
    return { error: '送信に失敗しました。もう一度お試しください' }
  }
}
