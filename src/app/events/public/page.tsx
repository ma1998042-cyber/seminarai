import Link from "next/link";
import { getDbFromContext } from "@/lib/db";
import { getPublicEvents } from "@/lib/db/queries/events";
import { formatDateTime } from "@/lib/utils";
import { CalendarDays, MapPin, Globe, Users } from "lucide-react";

export default async function PublicEventsPage() {
  const db = getDbFromContext();
  const events = await getPublicEvents(db);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">公開イベント一覧</h1>
          <p className="text-gray-500">参加可能なイベントをご覧ください</p>
        </div>

        {/* イベント一覧 */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">現在公開中のイベントはありません</h2>
            <p className="text-gray-400">新しいイベントが公開されるまでお待ちください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const isFull = event.capacity != null && event.registrationCount >= event.capacity;

              return (
                <Link
                  key={event.id}
                  href={`/e/${event.id}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* サムネイル */}
                  {(() => {
                    const thumb = event.thumbnailUrl || ((event.imageUrls as string[] | null)?.[0]);
                    return thumb ? (
                      <div className="w-full aspect-video bg-gray-100">
                        <img src={thumb} alt={event.title} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
                        <CalendarDays className="w-12 h-12 text-indigo-200" />
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

                      {/* 定員 */}
                      {event.capacity != null && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>
                            {event.registrationCount}/{event.capacity}名
                            {isFull && (
                              <span className="ml-2 text-red-600 font-medium">満席</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
