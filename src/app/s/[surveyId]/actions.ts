'use server'

import { getDb, surveys, surveyResponses } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export async function submitSurveyResponse(
  surveyId: string,
  organizationId: string,
  respondentName: string,
  respondentEmail: string,
  answers: Record<string, unknown>
): Promise<{ error?: string }> {
  const db = getDb()

  await db.insert(surveyResponses).values({
    surveyId,
    organizationId,
    respondentName: respondentName || null,
    respondentEmail: respondentEmail || null,
    answers: JSON.stringify(answers),
    submittedAt: new Date().toISOString(),
  })

  await db
    .update(surveys)
    .set({ responseCount: sql`${surveys.responseCount} + 1` })
    .where(eq(surveys.id, surveyId))

  return {}
}
