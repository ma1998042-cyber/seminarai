'use server'

import { getDb, surveys, surveyQuestions } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

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
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDb()

  await db
    .update(surveys)
    .set({
      title: data.title,
      description: data.description || null,
      thankYouMessage: data.thank_you_message || null,
      status: data.status,
      publishedAt: data.status === 'active' ? new Date().toISOString() : undefined,
      paymentEnabled: data.payment_enabled ?? false,
      paymentAmount: data.payment_amount ?? 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(surveys.id, surveyId))

  await db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, surveyId))

  if (data.questions.length > 0) {
    await db.insert(surveyQuestions).values(
      data.questions.map((q, i) => ({
        surveyId,
        sortOrder: i,
        questionType: q.question_type,
        title: q.title,
        description: q.description || null,
        isRequired: q.is_required,
        options: q.options.length > 0 ? JSON.stringify(q.options) : null,
      }))
    )
  }

  revalidatePath(`/surveys/${surveyId}`)
  return {}
}
