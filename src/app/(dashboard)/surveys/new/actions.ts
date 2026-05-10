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

export async function createSurvey(data: {
  title: string
  description?: string
  thank_you_message?: string
  event_id?: string | null
  status: 'draft' | 'active'
  questions: Question[]
  payment_enabled?: boolean
  payment_amount?: number
}): Promise<{ surveyId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_organization_id) return { error: '組織が見つかりません' }

  const { data: survey, error: surveyErr } = await admin
    .from('surveys')
    .insert({
      organization_id: profile.current_organization_id,
      event_id: data.event_id || null,
      title: data.title,
      description: data.description || null,
      thank_you_message: data.thank_you_message || 'ご回答ありがとうございました！',
      status: data.status,
      created_by: user.id,
      published_at: data.status === 'active' ? new Date().toISOString() : null,
      response_count: 0,
      payment_enabled: data.payment_enabled ?? false,
      payment_amount: data.payment_amount ?? 0,
    })
    .select()
    .single()

  if (surveyErr || !survey) return { error: surveyErr?.message || 'アンケートの作成に失敗しました' }

  if (data.questions.length > 0) {
    const { error: qErr } = await admin.from('survey_questions').insert(
      data.questions.map((q, i) => ({
        survey_id: survey.id,
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

  revalidatePath('/surveys')
  return { surveyId: survey.id }
}

export async function getEventsForOrg(): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('current_organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_organization_id) return []

  const { data } = await admin
    .from('events')
    .select('id, title')
    .eq('organization_id', profile.current_organization_id)
    .order('created_at', { ascending: false })

  return data ?? []
}
