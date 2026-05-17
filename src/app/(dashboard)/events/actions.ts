'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { events, surveys, eventRegistrations } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function deleteEventsAction(ids: string[]): Promise<{ success?: boolean; error?: string }> {
  if (!ids || ids.length === 0) return { error: '削除対象が選択されていません' }

  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が見つかりません' }

  // org検証: 全イベントが該当組織に属するか確認
  const foundEvents = await db.query.events.findMany({
    where: and(inArray(events.id, ids), eq(events.organizationId, orgId)),
    columns: { id: true },
  })
  const foundIds = foundEvents.map((e) => e.id)
  if (foundIds.length === 0) return { error: 'イベントが見つかりません' }

  // 関連アンケートのeventIdをnullに更新（リンク解除）
  await db.update(surveys).set({ eventId: null }).where(inArray(surveys.eventId, foundIds))

  // 関連する参加者登録を削除
  await db.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, foundIds))

  // イベントを削除
  await db.delete(events).where(and(inArray(events.id, foundIds), eq(events.organizationId, orgId)))

  revalidatePath('/events')
  return { success: true }
}
