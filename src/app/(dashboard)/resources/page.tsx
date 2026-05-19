import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getResources } from "@/lib/db/queries/resources";
import ResourceToggle from "./ResourceToggle";

export default async function ResourcesListPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const items = await getResources(db, orgId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">お役立ち資料管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            資料の作成・編集・公開を管理します
          </p>
        </div>
        <Link
          href="/resources/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          資料を追加
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">並び順</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">公開</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/resources/${item.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {item.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.sortOrder}</td>
                  <td className="px-6 py-4">
                    <ResourceToggle id={item.id} isPublished={item.isPublished} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">まだ資料がありません</h3>
          <p className="text-sm text-gray-400 mb-6">最初の資料を追加しましょう</p>
          <Link
            href="/resources/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            資料を追加する
          </Link>
        </div>
      )}
    </div>
  );
}
