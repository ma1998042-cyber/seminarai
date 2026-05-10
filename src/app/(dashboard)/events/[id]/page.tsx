import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, ClipboardList, Edit, ExternalLink, MapPin, Globe } from "lucide-react";
import { formatDateTime, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, cn } from "@/lib/utils";
import LinkSurveyButton from "./LinkSurveyButton";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  archived: "bg-amber-100 text-amber-700",
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) notFound();
  if (profile?.current_organization_id !== event.organization_id) redirect("/events");

  // Get related surveys
  const { data: surveys } = await admin
    .from("surveys")
    .select("id, title, status, response_count")
    .eq("event_id", event.id);

  // Surveys not yet linked to this event (for LinkSurveyButton)
  const { data: unlinkedSurveys } = await admin
    .from("surveys")
    .select("id, title")
    .eq("organization_id", event.organization_id)
    .or(`event_id.is.null,event_id.neq.${event.id}`)
    .order("created_at", { ascending: false });

  // Get registrations
  const { data: registrations, count: regCount } = await admin
    .from("event_registrations")
    .select("*", { count: "exact" })
    .eq("event_id", event.id)
    .limit(10);

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
            </div>
            <p className="text-sm text-gray-500">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</p>
          </div>
        </div>
        <Link
          href={`/events/${event.id}/edit`}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Edit className="w-4 h-4" />
          編集
        </Link>
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
                {event.start_date && (
                  <div>
                    <p className="text-gray-400 mb-0.5">開始日時</p>
                    <p className="font-medium text-gray-700">{formatDateTime(event.start_date)}</p>
                  </div>
                )}
                {event.end_date && (
                  <div>
                    <p className="text-gray-400 mb-0.5">終了日時</p>
                    <p className="font-medium text-gray-700">{formatDateTime(event.end_date)}</p>
                  </div>
                )}
              </div>
              {event.is_online && event.online_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <a href={event.online_url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline">{event.online_url}</a>
                </div>
              )}
              {!event.is_online && event.location && (
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
                <LinkSurveyButton eventId={event.id} unlinkedSurveys={unlinkedSurveys ?? []} />
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
                    <span className="text-sm font-medium text-gray-700">{survey.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{survey.response_count}件の回答</span>
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
                <p className="text-2xl font-bold text-gray-900">{event.registration_count}</p>
                <p className="text-sm text-gray-500">参加者数</p>
              </div>
            </div>
            {event.capacity && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>埋まり具合</span>
                  <span>{Math.round((event.registration_count / event.capacity) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min((event.registration_count / event.capacity) * 100, 100)}%` }}
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
              href={`/customers?source_event=${event.id}`}
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
