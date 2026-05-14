import { auth } from '@/lib/auth'
import { getDb, userProfiles, events } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, CalendarDays, Users, ExternalLink } from 'lucide-react'
import { formatDate, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, cn } from '@/lib/utils'
import { eq, desc } from 'drizzle-orm'

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const db = getDb()
  const profile = await db
    .select({ currentOrganizationId: userProfiles.currentOrganizationId })
    .from(userProfiles)
    .where(eq(userProfiles.id, session.user.id))
    .get()

  const orgId = profile?.currentOrganizationId
  if (!orgId) redirect('/onboarding')

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.organizationId, orgId))
    .orderBy(desc(events.createdAt))

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
    archived: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
          <p className="text-sm text-gray-500 mt-1">セミナー・ウェビナーなどのイベントを管理します</p>
        </div>
        <Link
          href="/events/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          イベントを作成
        </Link>
      </div>

      {eventRows.length > 0 ? (
        <div className="space-y-3">
          {eventRows.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', statusColors[event.status] || statusColors.draft)}>
                    {EVENT_STATUS_LABELS[event.status] || event.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</span>
                  {event.startDate && <span>{formatDate(event.startDate)}</span>}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.registrationCount}名
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">まだイベントがありません</h3>
          <p className="text-sm text-gray-400 mb-6">
            最初のイベントを作成して、アンケート収集を始めましょう
          </p>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            イベントを作成する
          </Link>
        </div>
      )}
    </div>
  )
}
