'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { getEventById, createEvent } from '@/lib/db/queries/events'
import { createSurvey } from '@/lib/db/queries/surveys'
import { events, surveys, eventRegistrations } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'

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

export async function duplicateEventAction(eventId: string): Promise<{ eventId?: string; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が見つかりません' }

  // 元イベント取得
  const source = await getEventById(db, orgId, eventId)
  if (!source) return { error: 'イベントが見つかりません' }

  // R2内の画像をコピー
  const { env } = getCloudflareContext()
  const newImageUrls: string[] = []

  for (const url of source.imageUrls ?? []) {
    // imageUrlsは "/api/images/events/uuid.ext" 形式 → R2キーは "events/uuid.ext"
    const r2Key = url.replace(/^\/api\/images\//, '')
    if (!r2Key) continue

    try {
      const object = await env.R2.get(r2Key)
      if (object) {
        const ext = r2Key.split('.').pop() || 'jpg'
        const prefix = r2Key.split('/')[0] || 'events'
        const newKey = `${prefix}/${crypto.randomUUID()}.${ext}`
        await env.R2.put(newKey, await object.arrayBuffer(), {
          httpMetadata: object.httpMetadata,
        })
        newImageUrls.push(`/api/images/${newKey}`)
      }
    } catch {
      // 画像コピー失敗時はスキップ
    }
  }

  // 新イベント作成
  const newEvent = await createEvent(db, {
    organizationId: orgId,
    title: `${source.title}(コピー)`,
    description: source.description ?? undefined,
    eventType: source.eventType ?? undefined,
    status: 'draft',
    visibility: 'draft',
    startDate: undefined,
    endDate: undefined,
    location: source.location ?? undefined,
    isOnline: source.isOnline ?? undefined,
    onlineUrl: source.onlineUrl ?? undefined,
    capacity: source.capacity ?? undefined,
    thumbnailUrl: newImageUrls[0] ?? undefined,
    imageUrls: newImageUrls,
    participationRequirements: source.participationRequirements ?? undefined,
    recommendedFor: source.recommendedFor ?? undefined,
    participationBenefits: source.participationBenefits ?? undefined,
    tags: source.tags ?? undefined,
    settings: source.settings ?? undefined,
    createdBy: user.id,
  })

  if (!newEvent) return { error: 'イベントの複製に失敗しました' }

  // アンケートを自動作成（申し込みアンケート・終了後アンケート）
  await Promise.all([
    createSurvey(db, {
      organizationId: orgId,
      eventId: newEvent.id,
      title: `${newEvent.title} - 申し込みアンケート`,
      category: 'pre_event',
      status: 'draft',
      createdBy: user.id,
    }),
    createSurvey(db, {
      organizationId: orgId,
      eventId: newEvent.id,
      title: `${newEvent.title} - 終了後アンケート`,
      category: 'post_event',
      status: 'draft',
      createdBy: user.id,
    }),
  ])

  revalidatePath('/events')
  return { eventId: newEvent.id }
}
