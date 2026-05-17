import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, CalendarDays, Globe, ExternalLink } from "lucide-react";
import { EVENT_VISIBILITY_LABELS, cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEvents, countEvents } from "@/lib/db/queries/events";
import Pagination from "@/components/Pagination";
import EventList from "./EventList";

const PAGE_SIZE = 20;

const scheduleTabs = [
  { value: "upcoming", label: "開催予定" },
  { value: "ended", label: "終了済み" },
];

const visibilityTabs = [
  { value: "", label: "すべて" },
  { value: "public", label: "一般公開" },
  { value: "unlisted", label: "限定公開" },
  { value: "draft", label: "下書き" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string; page?: string; tab?: string }>;
}) {
  const { visibility, page: pageParam, tab } = await searchParams;
  const currentTab = tab === "ended" ? "ended" : "upcoming";
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const ended = currentTab === "ended";
  const [events, totalCount] = await Promise.all([
    getEvents(db, orgId, {
      visibility: visibility || undefined,
      ended,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    }),
    countEvents(db, orgId, { visibility: visibility || undefined, ended }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
          <p className="text-sm text-gray-500 mt-1">セミナー・ウェビナーなどのイベントを管理します</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/events/public"
            target="_blank"
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-4 h-4" />
            公開ページ
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Link>
          <Link
            href="/events/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            イベントを作成
          </Link>
        </div>
      </div>

      {/* Schedule tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {scheduleTabs.map((t) => (
          <Link
            key={t.value}
            href={t.value === "upcoming" ? (visibility ? `/events?visibility=${visibility}` : "/events") : (visibility ? `/events?tab=ended&visibility=${visibility}` : "/events?tab=ended")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              currentTab === t.value
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Visibility tabs */}
      <div className="flex gap-2">
        {visibilityTabs.map((vTab) => {
          const params = new URLSearchParams();
          if (currentTab === "ended") params.set("tab", "ended");
          if (vTab.value) params.set("visibility", vTab.value);
          const href = params.toString() ? `/events?${params.toString()}` : "/events";
          return (
            <Link
              key={vTab.value}
              href={href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                (visibility || "") === vTab.value
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {vTab.label}
            </Link>
          );
        })}
      </div>

      {/* Events list */}
      {events && events.length > 0 ? (
        <EventList events={events.map((e) => ({
          id: e.id,
          title: e.title,
          status: e.status,
          visibility: e.visibility,
          eventType: e.eventType,
          startDate: e.startDate,
          registrationCount: e.registrationCount,
        }))} />
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

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
