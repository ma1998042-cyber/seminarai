'use server'

import { getDb, surveys, surveyQuestions, events } from '@/lib/db'
import { getCurrentUser, getCurrentOrgId } from '@/lib/session'
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
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  const db = getDb()

  const survey = await db
    .insert(surveys)
    .values({
      organizationId: orgId,
      eventId: data.event_id || null,
      title: data.title,
      description: data.description || null,
      thankYouMessage: data.thank_you_message || 'ご回答ありがとうございました！',
      status: data.status,
      createdBy: user.id,
      publishedAt: data.status === 'active' ? new Date().toISOString() : null,
      responseCount: 0,
      paymentEnabled: data.payment_enabled ?? false,
      paymentAmount: data.payment_amount ?? 0,
    })
    .returning()
    .get()

  if (!survey) return { error: 'アンケートの作成に失敗しました' }

  if (data.questions.length > 0) {
    await db.insert(surveyQuestions).values(
      data.questions.map((q, i) => ({
        surveyId: survey.id,
        sortOrder: i,
        questionType: q.question_type,
        title: q.title,
        description: q.description || null,
        isRequired: q.is_required,
        options: q.options.length > 0 ? JSON.stringify(q.options) : null,
      }))
    )
  }

  revalidatePath('/surveys')
  return { surveyId: survey.id }
}

export async function getEventsForOrg(): Promise<{ id: string; title: string }[]> {
  const orgId = await getCurrentOrgId()
  if (!orgId) return []

  const db = getDb()
  const rows = await db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(eq(events.organizationId, orgId))
    .orderBy(events.createdAt)

  return rows
}
