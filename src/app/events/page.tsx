import { getDb, events, organizations, eventRegistrations, surveys } from '@/lib/db'
import { eq, and, gte, desc, count } from 'drizzle-orm'
import Link from 'next/link'
import { CalendarDays, MapPin, Monitor, Users, Clock, ChevronRight, Zap } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import EventRegisterButton from './EventRegisterButton'

export const revalidate = 60

function EventTypeLabel({ type }: { type: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    seminar: { label: 'セミナー', color: 'bg-blue-100 text-blue-700' },
    webinar: { label: 'ウェビナー', color: 'bg-purple-100 text-purple-700' },
    workshop: { label: 'ワークショップ', color: 'bg-orange-100 text-orange-700' },
    course: { label: 'コース', color: 'bg-green-100 text-green-700' },
    other: { label: 'その他', color: 'bg-gray-100 text-gray-600' },
  }
  const { label, color } = labels[type] ?? labels.other
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

export default async function PublicEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; type?: string }>
}) {
  const { org: orgSlug, type: filterType } = await searchParams
  const db = getDb()

  const now = new Date().toISOString()

  // 対象組織を取得（orgSlug 指定があれば絞り込み）
  let orgIds: string[] = []
  if (orgSlug) {
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, orgSlug), eq(organizations.isActive, true)))
      .get()
    if (org) orgIds = [org.id]
  } else {
    const orgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.isActive, true))
    orgIds = orgs.map((o) => o.id)
  }

  if (orgIds.length === 0) {
    return <EmptyState />
  }

  // activeイベントを取得（開催日降順）
  const eventRows = await db
    .select({
      id: events.id,
      organizationId: events.organizationId,
      title: events.title,
      description: events.description,
      eventType: events.eventType,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
      isOnline: events.isOnline,
      onlineUrl: events.onlineUrl,
      capacity: events.capacity,
      registrationCount: events.registrationCount,
      thumbnailUrl: events.thumbnailUrl,
      tags: events.tags,
    })
    .from(events)
    .where(
      and(
        eq(events.status, 'active'),
        ...orgIds.map((id) => eq(events.organizationId, id)).slice(0, 1)
      )
    )
    .orderBy(desc(events.startDate))
    .limit(50)

  const allEvents = filterType
    ? eventRows.filter((e) => e.eventType === filterType)
    : eventRows

  // 組織名マップ
  const orgMap: Record<string, string> = {}
  for (const orgId of orgIds) {
    const org = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .get()
    if (org) orgMap[org.id] = org.name
  }

  // 各イベントに紐づくアンケートを取得
  const surveyMap: Record<string, string> = {}
  for (const ev of allEvents) {
    const survey = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(and(eq(surveys.eventId, ev.id), eq(surveys.status, 'active')))
      .get()
    if (survey) surveyMap[ev.id] = survey.id
  }

  const upcoming = allEvents.filter((e) => !e.startDate || e.startDate >= now)
  const past = allEvents.filter((e) => e.startDate && e.startDate < now)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">SeminarFlow</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            主催者ログイン
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {orgSlug ? (orgMap[orgIds[0]] ?? 'イベント') + ' のイベント' : 'イベント一覧'}
          </h1>
          <p className="text-gray-500">開催予定のセミナー・勉強会・ワークショップを掲載しています</p>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { value: '', label: 'すべて' },
            { value: 'seminar', label: 'セミナー' },
            { value: 'webinar', label: 'ウェビナー' },
            { value: 'workshop', label: 'ワークショップ' },
            { value: 'course', label: 'コース' },
          ].map((item) => {
            const isActive = (filterType ?? '') === item.value
            const href = item.value
              ? `?${new URLSearchParams({ ...(orgSlug ? { org: orgSlug } : {}), type: item.value }).toString()}`
              : orgSlug ? `?org=${orgSlug}` : '/events'
            return (
              <Link
                key={item.value}
                href={href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* 開催予定 */}
        {upcoming.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              開催予定のイベント
              <span className="text-sm font-normal text-gray-400">({upcoming.length}件)</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  orgName={orgMap[event.organizationId]}
                  surveyId={surveyMap[event.id]}
                  isUpcoming
                />
              ))}
            </div>
          </section>
        )}

        {/* 過去のイベント */}
        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">
              過去のイベント
              <span className="text-sm font-normal text-gray-400 ml-2">({past.length}件)</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 opacity-75">
              {past.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  orgName={orgMap[event.organizationId]}
                  surveyId={surveyMap[event.id]}
                  isUpcoming={false}
                />
              ))}
            </div>
          </section>
        )}

        {allEvents.length === 0 && <EmptyState />}
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-xs text-gray-400">
        Powered by SeminarFlow
      </footer>
    </div>
  )
}

type EventRow = {
  id: string
  organizationId: string
  title: string
  description: string | null
  eventType: string
  startDate: string | null
  endDate: string | null
  location: string | null
  isOnline: boolean
  onlineUrl: string | null
  capacity: number | null
  registrationCount: number
  thumbnailUrl: string | null
  tags: string
}

function EventCard({
  event,
  orgName,
  surveyId,
  isUpcoming,
}: {
  event: EventRow
  orgName?: string
  surveyId?: string
  isUpcoming: boolean
}) {
  const isFull = event.capacity != null && event.registrationCount >= event.capacity
  const tags: string[] = (() => {
    try { return JSON.parse(event.tags) } catch { return [] }
  })()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* サムネイル */}
      {event.thumbnailUrl ? (
        <div className="h-40 bg-indigo-50 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.thumbnailUrl} alt={event.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center">
          <CalendarDays className="w-12 h-12 text-indigo-300" />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <EventTypeLabel type={event.eventType} />
            <h3 className="font-bold text-gray-900 leading-snug line-clamp-2">{event.title}</h3>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="space-y-1.5 text-sm text-gray-500">
          {event.startDate && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(event.startDate)}</span>
              {event.endDate && event.endDate !== event.startDate && (
                <span>〜 {formatDate(event.endDate)}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {event.isOnline ? (
              <>
                <Monitor className="w-4 h-4 flex-shrink-0 text-blue-500" />
                <span className="text-blue-600">オンライン開催</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{event.location || '会場未定'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>
              {event.registrationCount}名申込済
              {event.capacity != null && ` / 定員${event.capacity}名`}
            </span>
            {isFull && (
              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                満員
              </span>
            )}
          </div>
        </div>

        {/* 説明 */}
        {event.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
        )}

        {/* タグ */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 主催者 */}
        {orgName && (
          <p className="text-xs text-gray-400">主催：{orgName}</p>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2 flex gap-2">
          {isUpcoming && !isFull && surveyId && (
            <Link
              href={`/s/${surveyId}`}
              className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg text-center hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
            >
              申し込む
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          {isUpcoming && !isFull && !surveyId && (
            <EventRegisterButton eventId={event.id} />
          )}
          {isFull && (
            <span className="flex-1 bg-gray-100 text-gray-400 text-sm font-semibold py-2.5 rounded-lg text-center cursor-not-allowed">
              満員御礼
            </span>
          )}
          {!isUpcoming && (
            <span className="flex-1 bg-gray-50 text-gray-400 text-sm py-2.5 rounded-lg text-center border border-gray-100">
              終了済み
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <CalendarDays className="w-16 h-16 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">現在開催予定のイベントはありません</h3>
      <p className="text-sm text-gray-400">新しいイベントが追加されると、ここに表示されます</p>
    </div>
  )
}
