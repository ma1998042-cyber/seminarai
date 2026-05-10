'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function submitSurveyResponse(
  surveyId: string,
  organizationId: string,
  respondentName: string,
  respondentEmail: string,
  answers: Record<string, unknown>
): Promise<{ error?: string }> {
  const admin = await createAdminClient()

  const { error } = await admin.from('survey_responses').insert({
    survey_id: surveyId,
    organization_id: organizationId,
    respondent_name: respondentName || null,
    respondent_email: respondentEmail || null,
    answers,
    submitted_at: new Date().toISOString(),
  })

  if (error) return { error: '送信に失敗しました。もう一度お試しください' }

  // response_count をインクリメント
  const { data: survey } = await admin
    .from('surveys')
    .select('response_count')
    .eq('id', surveyId)
    .single()

  await admin
    .from('surveys')
    .update({ response_count: (survey?.response_count ?? 0) + 1 })
    .eq('id', surveyId)

  return {}
}
