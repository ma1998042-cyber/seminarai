import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Users, ClipboardList, Edit, ExternalLink, MapPin, Globe, BookOpen } from "lucide-react";
import { formatDateTime, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_VISIBILITY_LABELS, SURVEY_CATEGORY_LABELS, cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEventById, getEventRegistrations } from "@/lib/db/queries/events";
import { eq, and, or, isNull, ne } from "drizzle-orm";
import { surveys as surveysTable } from "@/lib/db/schema";
import LinkSurveyButton from "./LinkSurveyButton";
import DeleteEventButton from "./DeleteEventButton";
import DuplicateEventButton from "./DuplicateEventButton";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  archived: "bg-amber-100 text-amber-700",
};

const visibilityColors: Record<string, string> = {
  public: "bg-blue-100 text-blue-700",
  unlisted: "bg-yellow-100 text-yellow-700",
  draft: "bg-gray-100 text-gray-500",
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const event = await getEventById(db, orgId, id);
  if (!event) notFound();

  // Get related surveys
  const surveys = await db.query.surveys.findMany({
    where: eq(surveysTable.eventId, event.id),
    columns: { id: true, title: true, status: true, category: true, responseCount: true },
  });

  // Surveys not yet linked to this event (for LinkSurveyButton)
  const unlinkedSurveys = await db.query.surveys.findMany({
    where: and(
      eq(surveysTable.organizationId, orgId),
      or(isNull(surveysTable.eventId), ne(surveysTable.eventId, event.id)),
    ),
    columns: { id: true, title: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  // Get registrations
  const registrations = await getEventRegistrations(db, event.id);
  const regCount = registrations.length;

  const s = statusColors[event.status] || statusColors.draft;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/events" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", s)}>
                {EVENT_STATUS_LABELS[event.status] || event.status}
              </span>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", visibilityColors[event.visibility] || visibilityColors.draft)}>
                {EVENT_VISIBILITY_LABELS[event.visibility] || event.visibility}
              </span>
            </div>
            <p className="text-sm text-gray-500">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/events/public/${event.id}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            公開ページ
          </Link>
          <Link
            href={`/events/${event.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            編集
          </Link>
          <DuplicateEventButton eventId={event.id} />
          <DeleteEventButton eventId={event.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event details card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">イベント詳細</h2>
            <div className="space-y-4">
              {event.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {event.startDate && (
                  <div>
                    <p className="text-gray-400 mb-0.5">開始日時</p>
                    <p className="font-medium text-gray-700">{formatDateTime(event.startDate)}</p>
                  </div>
                )}
                {event.endDate && (
                  <div>
                    <p className="text-gray-400 mb-0.5">終了日時</p>
                    <p className="font-medium text-gray-700">{formatDateTime(event.endDate)}</p>
                  </div>
                )}
              </div>
              {event.isOnline && event.onlineUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline">{event.onlineUrl}</a>
                </div>
              )}
              {!event.isOnline && event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{event.location}</span>
                </div>
              )}
              {event.capacity && (
                <div className="text-sm">
                  <span className="text-gray-400">定員：</span>
                  <span className="font-medium text-gray-700">{event.capacity}名</span>
                </div>
              )}
            </div>
          </div>

          {/* Related surveys */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">関連アンケート</h2>
              <div className="flex items-center gap-3">
                <LinkSurveyButton eventId={event.id} unlinkedSurveys={unlinkedSurveys} />
                <Link
                  href={`/surveys/new?event_id=${event.id}`}
                  className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <ClipboardList className="w-4 h-4" />
                  新規作成
                </Link>
              </div>
            </div>
            {surveys && surveys.length > 0 ? (
              <div className="space-y-2">
                {surveys.map((survey) => (
                  <Link
                    key={survey.id}
                    href={`/surveys/${survey.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{survey.title}</span>
                      {survey.category && survey.category !== "general" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          {SURVEY_CATEGORY_LABELS[survey.category] || survey.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{survey.responseCount}件の回答</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">まだアンケートがありません</p>
            )}
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{event.registrationCount}</p>
                <p className="text-sm text-gray-500">参加者数</p>
              </div>
            </div>
            {event.capacity && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>埋まり具合</span>
                  <span>{Math.round((event.registrationCount / event.capacity) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min((event.registrationCount / event.capacity) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">クイックアクション</h3>
            <Link
              href={`/surveys/new?event_id=${event.id}`}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              <ClipboardList className="w-4 h-4 text-gray-400" />
              アンケートを作成する
            </Link>
            <Link
              href={`/events/${event.id}/contents`}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              <BookOpen className="w-4 h-4 text-gray-400" />
              コンテンツを管理する
            </Link>
            <Link
              href={`/events/${event.id}/participants`}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
            >
              <Users className="w-4 h-4 text-gray-400" />
              参加者リストを見る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
