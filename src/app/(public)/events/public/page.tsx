import Link from "next/link";
import { Suspense } from "react";
import { getDbFromContext } from "@/lib/db";
import { getPublicEvents } from "@/lib/db/queries/events";
import { getActiveBanners } from "@/lib/db/queries/banners";
import { formatDateTime, EVENT_TYPE_LABELS } from "@/lib/utils";
import { CalendarDays, MapPin, Globe, Users, Clock } from "lucide-react";
import EventFilters from "./EventFilters";

export default async function PublicEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const monthFilter = params.month === "current" || params.month === "next" ? params.month : undefined;
  const eventType = params.type || undefined;
  const q = params.q || undefined;
  const db = getDbFromContext();
  const [events, allBanners] = await Promise.all([
    getPublicEvents(db, { month: monthFilter, eventType, q }),
    getActiveBanners(db),
  ]);
  const banners = allBanners.slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 pb-32 lg:pb-12">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">公開イベント一覧</h1>
          <p className="text-gray-500">参加可能なイベントをご覧ください</p>
        </div>

        {/* 月別フィルタ */}
        <div className="flex justify-center gap-2 mb-4">
          <Link
            href="/events/public"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !monthFilter
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            すべて
          </Link>
          <Link
            href="/events/public?month=current"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              monthFilter === "current"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            今月
          </Link>
          <Link
            href="/events/public?month=next"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              monthFilter === "next"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            来月
          </Link>
        </div>

        {/* 検索 + イベント種類フィルタ */}
        <Suspense fallback={null}>
          <EventFilters />
        </Suspense>

        {/* 2カラムレイアウト: イベント一覧 + バナーサイドバー */}
        <div className="flex gap-8">
          {/* メインコンテンツ: イベント一覧 */}
          <div className="flex-1 min-w-0">
            {events.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">現在公開中のイベントはありません</h2>
                <p className="text-gray-400">新しいイベントが公開されるまでお待ちください</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event) => {
                  const isFull = event.capacity != null && event.registrationCount >= event.capacity;
                  const isDeadlineExpired = event.registrationDeadline
                    ? new Date(event.registrationDeadline) < new Date()
                    : false;
                  const isSoldOut = isFull || isDeadlineExpired;

                  return (
                    <Link
                      key={event.id}
                      href={`/e/${event.id}`}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* サムネイル + 完売御礼オーバーレイ */}
                      {(() => {
                        const thumb = event.thumbnailUrl || ((event.imageUrls as string[] | null)?.[0]);
                        return (
                          <div className="relative w-full aspect-video bg-gray-100">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={event.title}
                                className={`w-full h-full object-contain ${isSoldOut ? "grayscale" : ""}`}
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center ${isSoldOut ? "grayscale" : ""}`}>
                                <CalendarDays className="w-12 h-12 text-indigo-200" />
                              </div>
                            )}
                            {isSoldOut && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-2xl font-bold text-red-500 bg-white/90 px-4 py-2 rounded-lg border-2 border-red-500 tracking-wider">
                                  完売御礼
                                </span>
                              </div>
                            )}
                            {/* イベント種類バッジ */}
                            {event.eventType && event.eventType !== "other" && (
                              <span className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                                {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <div className="p-5">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">{event.title}</h2>

                        <div className="space-y-2 text-sm text-gray-600">
                          {/* 日時 */}
                          {event.startDate && (
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>{formatDateTime(event.startDate)}</span>
                            </div>
                          )}

                          {/* 場所 */}
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}

                          {/* オンライン */}
                          {event.isOnline && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>オンライン開催</span>
                            </div>
                          )}

                          {/* 残席 / 完売御礼 */}
                          {isSoldOut ? (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-red-400 flex-shrink-0" />
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">完売御礼</span>
                            </div>
                          ) : event.showRemainingCapacity === 1 && event.capacity != null ? (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>あと{event.capacity - event.registrationCount}名</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右サイドバー: バナー */}
          {banners.length > 0 && (
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-12 self-start space-y-4">
              {banners.map((banner) => (
                <a
                  key={banner.id}
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-full aspect-square bg-gray-100">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </a>
              ))}
            </aside>
          )}
        </div>

        {/* モバイル用固定バナー（画面下部） */}
        {banners.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
            <div className="flex gap-3 justify-center max-w-md mx-auto">
              {banners.map((banner) => (
                <a
                  key={banner.id}
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block flex-1 rounded-lg overflow-hidden border border-gray-100 shadow-sm"
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-auto object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
