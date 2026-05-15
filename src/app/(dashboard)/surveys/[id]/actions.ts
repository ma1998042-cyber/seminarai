'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { surveys, surveyQuestions, surveyResponses } from '@/lib/db/schema'

async function getSessionAndOrg() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return null

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return null

  return { user, db, orgId: profile.currentOrganizationId }
}

export async function deleteSurveyAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getSessionAndOrg()
  if (!ctx) return { error: 'ログインが必要です' }

  // org検証: 該当アンケートが自組織のものか確認
  const survey = await ctx.db.query.surveys.findFirst({
    where: and(eq(surveys.id, id), eq(surveys.organizationId, ctx.orgId)),
    columns: { id: true },
  })
  if (!survey) return { error: 'アンケートが見つかりません' }

  try {
    // 子テーブルを先に削除
    await ctx.db.delete(surveyResponses).where(eq(surveyResponses.surveyId, id))
    await ctx.db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, id))
    // 親テーブルを削除
    await ctx.db.delete(surveys).where(eq(surveys.id, id))

    revalidatePath('/surveys')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '削除に失敗しました' }
  }
}
