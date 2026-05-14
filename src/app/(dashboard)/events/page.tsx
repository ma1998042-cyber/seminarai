import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, CalendarDays, Users, ExternalLink } from "lucide-react";
import { formatDate, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_VISIBILITY_LABELS, cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEvents } from "@/lib/db/queries/events";

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

const visibilityTabs = [
  { value: "", label: "すべて" },
  { value: "public", label: "一般公開" },
  { value: "unlisted", label: "限定公開" },
  { value: "draft", label: "下書き" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string }>;
}) {
  const { visibility } = await searchParams;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const events = await getEvents(db, orgId, visibility || undefined);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
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

      {/* Visibility tabs */}
      <div className="flex gap-2">
        {visibilityTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/events?visibility=${tab.value}` : "/events"}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              (visibility || "") === tab.value
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Events list */}
      {events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
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
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", statusColors[event.status] || statusColors.draft)}>
                    {EVENT_STATUS_LABELS[event.status] || event.status}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", visibilityColors[event.visibility] || visibilityColors.draft)}>
                    {EVENT_VISIBILITY_LABELS[event.visibility] || event.visibility}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</span>
                  {event.startDate && (
                    <span>{formatDate(event.startDate)}</span>
                  )}
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
          <h3 className="font-semibold text-gray-700 mb-2">
            {visibility ? `「${EVENT_VISIBILITY_LABELS[visibility] || visibility}」のイベントがありません` : "まだイベントがありません"}
          </h3>
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
  );
}
