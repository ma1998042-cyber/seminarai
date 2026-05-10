'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Question = {
  question_type: string
  title: string
  description?: string
  is_required: boolean
  options: string[]
  sort_order: number
}

export async function updateSurvey(surveyId: string, data: {
  title: string
  description?: string
  thank_you_message?: string
  status: 'draft' | 'active' | 'closed'
  questions: Question[]
  payment_enabled?: boolean
  payment_amount?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()

  const { error: surveyErr } = await admin.from('surveys').update({
    title: data.title,
    description: data.description || null,
    thank_you_message: data.thank_you_message || null,
    status: data.status,
    published_at: data.status === 'active' ? new Date().toISOString() : undefined,
    payment_enabled: data.payment_enabled ?? false,
    payment_amount: data.payment_amount ?? 0,
  }).eq('id', surveyId)

  if (surveyErr) return { error: surveyErr.message }

  // 既存の設問を削除して再挿入
  await admin.from('survey_questions').delete().eq('survey_id', surveyId)

  if (data.questions.length > 0) {
    const { error: qErr } = await admin.from('survey_questions').insert(
      data.questions.map((q, i) => ({
        survey_id: surveyId,
        sort_order: i,
        question_type: q.question_type,
        title: q.title,
        description: q.description || null,
        is_required: q.is_required,
        options: q.options.length > 0 ? q.options : null,
      }))
    )
    if (qErr) return { error: qErr.message }
  }

  revalidatePath(`/surveys/${surveyId}`)
  return {}
}
