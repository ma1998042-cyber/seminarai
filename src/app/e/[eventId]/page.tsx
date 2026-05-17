import { getDbFromContext } from "@/lib/db";
import { getPublicEvent } from "@/lib/db/queries/events";
import { surveys, surveyQuestions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";
import { CalendarDays, MapPin, Globe, Users, AlertCircle, Clock } from "lucide-react";
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
  const isDeadlineExpired = event.registrationDeadline
    ? new Date(event.registrationDeadline) < new Date()
    : false;

  // 申し込みアンケート（registration カテゴリ）の存在チェック
  const registrationSurvey = await db.query.surveys.findFirst({
    where: and(
      eq(surveys.eventId, event.id),
      eq(surveys.category, "registration"),
    ),
  });

  // アンケートがあれば質問を取得
  let questions: { id: string; questionType: string; title: string; description: string | null; isRequired: boolean; options: unknown[] | null }[] = [];
  if (registrationSurvey) {
    questions = await db.query.surveyQuestions.findMany({
      where: eq(surveyQuestions.surveyId, registrationSurvey.id),
      orderBy: (q, { asc }) => [asc(q.sortOrder)],
    });
  }

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
                <div className="w-full bg-gray-100 flex justify-center">
                  <img src={images[0]} alt={event.title} className="w-full h-auto max-h-[80vh]" style={{ objectFit: "contain" }} />
                </div>
              );
            }
            return (
              <div className="space-y-1">
                {images.map((url, i) => (
                  <div key={i} className="w-full bg-gray-100 flex justify-center">
                    <img src={url} alt={`${event.title} ${i + 1}`} className="w-full h-auto max-h-[80vh]" style={{ objectFit: "contain" }} />
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

              {/* 残席 */}
              {event.showRemainingCapacity === 1 && event.capacity != null && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {isFull ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">満席</span>
                  ) : (
                    <span>あと{event.capacity - event.registrationCount}名</span>
                  )}
                </div>
              )}

              {/* 申し込み期限 */}
              {event.registrationDeadline && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>
                    申し込み期限: {formatDateTime(event.registrationDeadline)}
                  </span>
                  {isDeadlineExpired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">期限切れ</span>
                  )}
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

        {/* 参加条件 */}
        {event.participationRequirements && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800 mb-1">参加条件</h3>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">{event.participationRequirements}</p>
              </div>
            </div>
          </div>
        )}

        {/* 申し込みフォーム or 申し込み終了メッセージ */}
        {isDeadlineExpired ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">申し込み終了</h3>
            <p className="text-sm text-gray-500">このイベントの申し込み期限は終了しました</p>
          </div>
        ) : (
          <EventRegistrationForm
            eventId={event.id}
            isFull={isFull}
            surveyId={registrationSurvey?.id ?? null}
            organizationId={event.organizationId}
            questions={questions.map((q) => ({
              id: q.id,
              question_type: q.questionType,
              title: q.title,
              description: q.description ?? null,
              is_required: q.isRequired,
              options: Array.isArray(q.options) ? (q.options as string[]) : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
