import { getDbFromContext } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { formatDate, formatNumber } from "@/lib/utils";

export default async function AdminOrganizationsPage() {
  const db = getDbFromContext();

  const orgs = await db.query.organizations.findMany({
    orderBy: [desc(organizations.createdAt)],
    with: { plan: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">契約組織一覧</h1>
        <p className="text-gray-400 text-sm mt-1">{orgs?.length || 0}件の組織</p>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">組織</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">プラン</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">ステータス</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {orgs?.map((org) => (
              <tr key={org.id} className="hover:bg-gray-750">
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-white">{org.name}</p>
                  <p className="text-xs text-gray-400">{org.slug}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-indigo-900 text-indigo-300 px-2.5 py-1 rounded-full font-medium">
                    {org.plan?.displayName || "Free"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${org.isActive ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {org.isActive ? "アクティブ" : "停止中"}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  {formatDate(org.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
