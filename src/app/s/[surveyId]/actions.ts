'use server'

import { getDbFromContext } from '@/lib/db'
import { createSurveyResponse, incrementSurveyResponseCount } from '@/lib/db/queries/surveys'

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

    return {}
  } catch {
    return { error: '送信に失敗しました。もう一度お試しください' }
  }
}
