import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, Package, Pencil } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getServices } from "@/lib/db/queries/services";
import ServiceToggle from "./ServiceToggle";
import ServiceDeleteButton from "./ServiceDeleteButton";

export default async function ServicesListPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const items = await getServices(db, orgId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サービス管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            サービスの作成・編集・公開を管理します
          </p>
        </div>
        <Link
          href="/services/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          サービスを追加
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">画像</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">並び順</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">公開</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/services/${item.id}`}
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
                    <ServiceToggle id={item.id} isPublished={item.isPublished} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/services/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        編集
                      </Link>
                      <ServiceDeleteButton id={item.id} title={item.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">まだサービスがありません</h3>
          <p className="text-sm text-gray-400 mb-6">最初のサービスを追加しましょう</p>
          <Link
            href="/services/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            サービスを追加する
          </Link>
        </div>
      )}
    </div>
  );
}
