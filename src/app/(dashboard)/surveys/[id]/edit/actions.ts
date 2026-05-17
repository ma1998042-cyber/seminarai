'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { emailTemplates } from '@/lib/db/schema'
import {
  updateSurvey as updateSurveyDb,
  getSurveyById,
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
  completion_email_enabled?: boolean
  completion_email_subject?: string
  completion_email_body?: string
}) {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()

  // 自動作成アンケート（pre_event/post_event）のカテゴリ・イベント紐付け変更を拒否
  const existingSurvey = await getSurveyById(db, surveyId)
  if (!existingSurvey) return { error: 'アンケートが見つかりません' }

  const isAutoCreated = ['pre_event', 'post_event'].includes(existingSurvey.category ?? '')
  if (isAutoCreated) {
    if (data.category && data.category !== existingSurvey.category) {
      return { error: '自動作成アンケートのカテゴリは変更できません' }
    }
    // カテゴリが送信されない場合も既存値を維持
    data.category = existingSurvey.category ?? undefined
  }

  try {
    await updateSurveyDb(db, surveyId, {
      title: data.title,
      description: data.description || null,
      thankYouMessage: data.thank_you_message || null,
      category: data.category || 'general',
      status: data.status,
      publishedAt: data.status === 'active' ? new Date().toISOString() : null,
      deadline: data.deadline ?? null,
      paymentEnabled: data.payment_enabled ?? false,
      paymentAmount: data.payment_amount ?? 0,
      completionEmailEnabled: data.completion_email_enabled ?? false,
      completionEmailSubject: data.completion_email_subject || null,
      completionEmailBody: data.completion_email_body || null,
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

export async function getEmailTemplates(): Promise<{ id: string; name: string; subject: string; bodyHtml: string }[]> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return []

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return []

  const templates = await db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      subject: emailTemplates.subject,
      bodyHtml: emailTemplates.bodyHtml,
    })
    .from(emailTemplates)
    .where(eq(emailTemplates.organizationId, profile.currentOrganizationId))

  return templates
}
