'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { updateSurvey } from '@/lib/db/queries/surveys'
import { events, surveys, eventRegistrations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function linkSurveyToEvent(surveyId: string, eventId: string): Promise<{ error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()

  await updateSurvey(db, surveyId, { eventId })

  revalidatePath(`/events/${eventId}`)
  return {}
}

export async function deleteEventAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が見つかりません' }

  // org検証: イベントが該当組織に属するか確認
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, id), eq(events.organizationId, orgId)),
    columns: { id: true },
  })
  if (!event) return { error: 'イベントが見つかりません' }

  // 関連アンケートのeventIdをnullに更新（リンク解除）
  await db.update(surveys).set({ eventId: null }).where(eq(surveys.eventId, id))

  // 関連する参加者登録を削除（cascade設定済みだが明示的に）
  await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id))

  // イベントを削除
  await db.delete(events).where(and(eq(events.id, id), eq(events.organizationId, orgId)))

  revalidatePath('/events')
  return { success: true }
}

export async function getUnlinkedSurveys(eventId: string, orgId: string): Promise<{ id: string; title: string }[]> {
  const { surveys } = await import('@/lib/db/schema')
  const { eq, and, or, isNull, ne } = await import('drizzle-orm')

  const db = getDbFromContext()
  const data = await db.query.surveys.findMany({
    where: and(
      eq(surveys.organizationId, orgId),
      or(isNull(surveys.eventId), ne(surveys.eventId, eventId)),
    ),
    columns: { id: true, title: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  })

  return data
}
