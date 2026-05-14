'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { getEvents } from '@/lib/db/queries/events'
import { createSurvey as createSurveyDb, createSurveyQuestions } from '@/lib/db/queries/surveys'

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
  category?: string
  status: 'draft' | 'active'
  questions: Question[]
  payment_enabled?: boolean
  payment_amount?: number
}): Promise<{ surveyId?: string; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)

  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  try {
    const survey = await createSurveyDb(db, {
      organizationId: profile.currentOrganizationId,
      eventId: data.event_id || undefined,
      title: data.title,
      description: data.description || undefined,
      thankYouMessage: data.thank_you_message || 'ご回答ありがとうございました！',
      category: data.category || 'general',
      status: data.status,
      createdBy: user.id,
    })

    if (!survey) return { error: 'アンケートの作成に失敗しました' }

    if (data.questions.length > 0) {
      await createSurveyQuestions(
        db,
        survey.id,
        data.questions.map((q, i) => ({
          sortOrder: i,
          questionType: q.question_type,
          title: q.title,
          description: q.description || undefined,
          isRequired: q.is_required,
          options: q.options.length > 0 ? q.options : null,
        }))
      )
    }

    revalidatePath('/surveys')
    return { surveyId: survey.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'アンケートの作成に失敗しました' }
  }
}

export async function getEventsForOrg(): Promise<{ id: string; title: string }[]> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return []

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)

  if (!profile?.currentOrganizationId) return []

  const eventsList = await getEvents(db, profile.currentOrganizationId)
  return eventsList.map(e => ({ id: e.id, title: e.title }))
}
