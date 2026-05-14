import { getDbFromContext } from "@/lib/db";
import { getPublicEvent } from "@/lib/db/queries/events";
import { formatDateTime } from "@/lib/utils";
import { CalendarDays, MapPin, Globe, Users } from "lucide-react";
import EventRegistrationForm from "./EventRegistrationForm";

export default async function PublicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const db = getDbFromContext();

  const event = await getPublicEvent(db, eventId);

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">イベントを表示できません</h2>
          <p className="text-gray-400">このイベントは現在公開されていません</p>
        </div>
      </div>
    );
  }

  const isFull = event.capacity != null && event.registrationCount >= event.capacity;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー: サムネイル + タイトル */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {(() => {
            const images = (event.imageUrls as string[] | null)?.length
              ? (event.imageUrls as string[])
              : event.thumbnailUrl
                ? [event.thumbnailUrl]
                : [];
            if (images.length === 0) return null;
            if (images.length === 1) {
              return (
                <div className="w-full aspect-video bg-gray-100">
                  <img src={images[0]} alt={event.title} className="w-full h-full object-contain" />
                </div>
              );
            }
            return (
              <div className="grid grid-cols-3 gap-1">
                {images.map((url, i) => (
                  <div key={i} className={`bg-gray-100 ${i === 0 ? "col-span-3 aspect-video" : "aspect-video"}`}>
                    <img src={url} alt={`${event.title} ${i + 1}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h1>

            <div className="space-y-3 text-sm text-gray-600">
              {/* 日時 */}
              {event.startDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>
                    {formatDateTime(event.startDate)}
                    {event.endDate && ` - ${formatDateTime(event.endDate)}`}
                  </span>
                </div>
              )}

              {/* 場所 */}
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{event.location}</span>
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
                    定員 {event.capacity}名（申込 {event.registrationCount}名）
                    {isFull && (
                      <span className="ml-2 text-red-600 font-medium">満席</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* 説明 */}
            {event.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* 申し込みフォーム */}
        <EventRegistrationForm
          eventId={event.id}
          isFull={isFull}
        />
      </div>
    </div>
  );
}
