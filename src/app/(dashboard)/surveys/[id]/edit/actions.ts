'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import {
  updateSurvey as updateSurveyDb,
  deleteSurveyQuestions,
  createSurveyQuestions,
} from '@/lib/db/queries/surveys'

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
  category?: string
  status: 'draft' | 'active' | 'closed'
  questions: Question[]
  payment_enabled?: boolean
  payment_amount?: number
  deadline?: number | null
}) {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()

  try {
    await updateSurveyDb(db, surveyId, {
      title: data.title,
      description: data.description || null,
      thankYouMessage: data.thank_you_message || null,
      category: data.category || 'general',
      status: data.status,
      publishedAt: data.status === 'active' ? new Date().toISOString() : null,
      deadline: data.deadline ?? null,
    })

    // 既存の設問を削除して再挿入
    await deleteSurveyQuestions(db, surveyId)

    if (data.questions.length > 0) {
      await createSurveyQuestions(
        db,
        surveyId,
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

    revalidatePath(`/surveys/${surveyId}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : '更新に失敗しました' }
  }
}
