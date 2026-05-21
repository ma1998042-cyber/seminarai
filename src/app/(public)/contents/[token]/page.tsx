import { eq, and } from "drizzle-orm";
import { FileText, Download, Video, Link as LinkIcon, XCircle } from "lucide-react";
import { getDbFromContext } from "@/lib/db";
import { contentAccessTokens, workshopContents, events } from "@/lib/db/schema";

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  file: FileText,
  video: Video,
  link: LinkIcon,
};

export default async function ContentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = getDbFromContext();

  // トークンで contentAccessTokens を検索
  const accessToken = await db.query.contentAccessTokens.findFirst({
    where: eq(contentAccessTokens.token, token),
  });

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            無効なアクセスリンクです
          </h2>
          <p className="text-gray-400 text-sm">
            このリンクは無効か、期限切れの可能性があります。
          </p>
        </div>
      </div>
    );
  }

  // 初回アクセス時に accessedAt を更新
  if (!accessToken.accessedAt) {
    await db
      .update(contentAccessTokens)
      .set({ accessedAt: new Date().toISOString() })
      .where(eq(contentAccessTokens.id, accessToken.id));
  }

  // イベント情報を取得
  const event = await db.query.events.findFirst({
    where: eq(events.id, accessToken.eventId),
    columns: { id: true, title: true },
  });

  // 公開されているワークショップコンテンツを取得
  const contents = await db.query.workshopContents.findMany({
    where: and(
      eq(workshopContents.eventId, accessToken.eventId),
      eq(workshopContents.isPublished, 1),
    ),
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 mb-6 border border-gray-100 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {event?.title || "コンテンツ"}
          </h1>
          <p className="text-gray-500 text-sm">
            以下のコンテンツをご利用いただけます
          </p>
        </div>

        {contents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
            <p className="text-gray-400">
              現在公開されているコンテンツはありません
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contents.map((content) => {
              const Icon = CONTENT_TYPE_ICONS[content.contentType] || FileText;
              return (
                <div
                  key={content.id}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {content.title}
                        </h3>
                        {content.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {content.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {content.fileUrl && (
                      <a
                        href={content.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        ダウンロード
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
