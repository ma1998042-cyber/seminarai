import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, FileText, Video, Link as LinkIcon, Eye, Users } from "lucide-react";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEventById } from "@/lib/db/queries/events";
import { workshopContents, contentAccessTokens } from "@/lib/db/schema";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  file: "ファイル",
  video: "動画",
  link: "リンク",
};

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  file: FileText,
  video: Video,
  link: LinkIcon,
};

export default async function EventContentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  // ワークショップコンテンツ一覧を取得
  const contents = await db.query.workshopContents.findMany({
    where: and(
      eq(workshopContents.eventId, event.id),
      eq(workshopContents.organizationId, orgId),
    ),
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });

  // アクセストークン統計を取得
  const tokenStats = await db
    .select({
      total: sql<number>`count(*)`,
      accessed: sql<number>`count(${contentAccessTokens.accessedAt})`,
    })
    .from(contentAccessTokens)
    .where(eq(contentAccessTokens.eventId, event.id));

  const totalTokens = tokenStats[0]?.total ?? 0;
  const accessedTokens = tokenStats[0]?.accessed ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${event.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              コンテンツ管理
            </h1>
            <p className="text-sm text-gray-500">{event.title}</p>
          </div>
        </div>
      </div>

      {/* アクセス統計 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {contents.length}
              </p>
              <p className="text-sm text-gray-500">コンテンツ数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalTokens}</p>
              <p className="text-sm text-gray-500">トークン発行数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {accessedTokens}
              </p>
              <p className="text-sm text-gray-500">アクセス済み</p>
            </div>
          </div>
          {totalTokens > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>
                  {totalTokens}件中{accessedTokens}件アクセス済み
                </span>
                <span>
                  {Math.round((accessedTokens / totalTokens) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{
                    width: `${Math.min((accessedTokens / totalTokens) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* コンテンツ一覧 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">コンテンツ一覧</h2>
        {contents.length === 0 ? (
          <p className="text-sm text-gray-400">
            まだコンテンツが登録されていません
          </p>
        ) : (
          <div className="space-y-3">
            {contents.map((content) => {
              const Icon =
                CONTENT_TYPE_ICONS[content.contentType] || FileText;
              return (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {content.title}
                      </p>
                      {content.description && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {content.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
                      {CONTENT_TYPE_LABELS[content.contentType] ||
                        content.contentType}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        content.isPublished
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      {content.isPublished ? "公開" : "非公開"}
                    </span>
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
