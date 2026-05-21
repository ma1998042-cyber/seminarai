import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, Pencil } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEventById } from "@/lib/db/queries/events";
import { getWorkshopContents } from "@/lib/db/queries/workshopContents";
import ContentToggle from "./ContentToggle";
import ContentDeleteButton from "./ContentDeleteButton";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  manual: "マニュアル",
  template: "テンプレート",
  video: "動画",
  other: "その他",
};

export default async function ContentsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const event = await getEventById(db, orgId, eventId);
  if (!event) notFound();

  const items = await getWorkshopContents(db, orgId, eventId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {event.title} に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">コンテンツ管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              {event.title} のワークショップコンテンツを管理します
            </p>
          </div>
          <Link
            href={`/events/${eventId}/contents/new`}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            コンテンツを追加
          </Link>
        </div>
      </div>

      {items && items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">種別</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">並び順</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">公開</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/events/${eventId}/contents/${item.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {item.title}
                    </Link>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                      {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.sortOrder}</td>
                  <td className="px-6 py-4">
                    <ContentToggle id={item.id} eventId={eventId} isPublished={!!item.isPublished} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${eventId}/contents/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        編集
                      </Link>
                      <ContentDeleteButton id={item.id} eventId={eventId} title={item.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">まだコンテンツがありません</h3>
          <p className="text-sm text-gray-400 mb-6">最初のコンテンツを追加しましょう</p>
          <Link
            href={`/events/${eventId}/contents/new`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            コンテンツを追加する
          </Link>
        </div>
      )}
    </div>
  );
}
