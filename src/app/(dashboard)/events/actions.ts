'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { getEventById, createEvent } from '@/lib/db/queries/events'
import { getOrganizationById } from '@/lib/db/queries/organizations'
import { createSurvey } from '@/lib/db/queries/surveys'
import { events, surveys, eventRegistrations } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getValidAccessToken, getFreeBusy } from '@/lib/google-calendar'

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

export async function getAvailableDatesAction(): Promise<{
  dates?: { date: string; status: 'both_free' | 'one_free' | 'both_busy' }[];
  error?: string;
}> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が見つかりません' }

  const org = await getOrganizationById(db, orgId)
  if (!org) return { error: '組織が見つかりません' }

  const settings = (org.settings || {}) as Record<string, unknown>
  const secondaryCalendarId = settings.secondaryCalendarId as string | undefined

  // Googleトークンの取得
  const { env } = getCloudflareContext()
  const accessToken = await getValidAccessToken(
    db,
    user.id,
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  )

  if (!accessToken) {
    return { error: '設定画面でGoogleカレンダーを連携してください' }
  }

  // カレンダーID一覧（プライマリ + セカンダリ）
  const calendarIds = ['primary']
  if (secondaryCalendarId) {
    calendarIds.push(secondaryCalendarId)
  }

  // 今日から1ヶ月先まで
  const now = new Date()
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const timeMax = new Date(timeMin)
  timeMax.setMonth(timeMax.getMonth() + 1)

  try {
    const freeBusy = await getFreeBusy(
      accessToken,
      calendarIds,
      timeMin.toISOString(),
      timeMax.toISOString(),
    )

    // 日付ごとの空き状況を計算
    const dates: { date: string; status: 'both_free' | 'one_free' | 'both_busy' }[] = []
    const current = new Date(timeMin)

    while (current < timeMax) {
      const dateStr = current.toISOString().split('T')[0]
      const dayStart = new Date(current)
      const dayEnd = new Date(current)
      dayEnd.setDate(dayEnd.getDate() + 1)

      let primaryBusy = false
      let secondaryBusy = false

      // プライマリカレンダーの予定チェック
      const primaryCalendar = freeBusy.calendars['primary']
      if (primaryCalendar?.busy) {
        primaryBusy = primaryCalendar.busy.some((slot) => {
          const slotStart = new Date(slot.start)
          const slotEnd = new Date(slot.end)
          return slotStart < dayEnd && slotEnd > dayStart
        })
      }

      // セカンダリカレンダーの予定チェック
      if (secondaryCalendarId) {
        const secondaryCalendar = freeBusy.calendars[secondaryCalendarId]
        if (secondaryCalendar?.busy) {
          secondaryBusy = secondaryCalendar.busy.some((slot) => {
            const slotStart = new Date(slot.start)
            const slotEnd = new Date(slot.end)
            return slotStart < dayEnd && slotEnd > dayStart
          })
        }
      }

      let status: 'both_free' | 'one_free' | 'both_busy'
      if (!primaryBusy && !secondaryBusy) {
        status = 'both_free'
      } else if (primaryBusy && secondaryBusy) {
        status = 'both_busy'
      } else {
        // セカンダリ未設定の場合: primaryBusy=false → both_free, true → both_busy
        status = secondaryCalendarId ? 'one_free' : (primaryBusy ? 'both_busy' : 'both_free')
      }

      dates.push({ date: dateStr, status })
      current.setDate(current.getDate() + 1)
    }

    return { dates }
  } catch (err) {
    console.error('FreeBusy API error:', err)
    return { error: 'カレンダーの空き情報の取得に失敗しました' }
  }
}
