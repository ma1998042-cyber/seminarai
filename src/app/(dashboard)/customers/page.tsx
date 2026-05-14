import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCustomers } from "@/lib/db/queries/customers";
import { getTags } from "@/lib/db/queries/tags";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Tag, Upload } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import CustomerSearch from "./CustomerSearch";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; status?: string }>;
}) {
  const { q, tag, status } = await searchParams;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/dashboard");

  // Tags for filter
  const allTags = await getTags(db, orgId);

  // Build customer query
  const customerList = await getCustomers(db, orgId, {
    search: q,
    status,
    limit: 100,
    withTags: true,
  });

  const count = customerList.length;

  // Filter by tag client-side
  const filtered = tag
    ? customerList.filter((c: any) =>
        c.customerTags?.some((ct: any) => ct.tag?.id === tag)
      )
    : customerList;

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    unsubscribed: "bg-gray-100 text-gray-500",
    bounced: "bg-red-100 text-red-600",
    blocked: "bg-red-100 text-red-600",
  };
  const statusLabels: Record<string, string> = {
    active: "有効",
    unsubscribed: "配信停止",
    bounced: "バウンス",
    blocked: "ブロック",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0}名の顧客</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/customers/tags"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Tag className="w-4 h-4" />
            タグ管理
          </Link>
          <Link
            href="/customers/import"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            CSVインポート
          </Link>
          <Link
            href="/customers/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            顧客を追加
          </Link>
        </div>
      </div>

      <CustomerSearch tags={allTags ?? []} currentQ={q} currentTag={tag} currentStatus={status} />

      {filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">顧客</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">会社・役職</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">ステータス</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">タグ</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((customer: any) => {
                const customerTags = (customer.customerTags as any[])
                  ?.map((ct: any) => ct.tag)
                  .filter(Boolean) ?? [];
                return (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-indigo-700">
                            {(customer.fullName || customer.email || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {customer.fullName || "名前なし"}
                          </p>
                          <p className="text-xs text-gray-400">{customer.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{customer.company || "—"}</p>
                      {customer.jobTitle && (
                        <p className="text-xs text-gray-400">{customer.jobTitle}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusColors[customer.status] || statusColors.active)}>
                        {statusLabels[customer.status] || customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {customerTags.slice(0, 3).map((tag: any) => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: tag.color + "20", color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {customerTags.length > 3 && (
                          <span className="text-xs text-gray-400">+{customerTags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {formatDate(customer.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">
            {q || tag || status ? "条件に一致する顧客がいません" : "まだ顧客がいません"}
          </h3>
          {!q && !tag && !status && (
            <>
              <p className="text-sm text-gray-400 mb-6">CSVインポートまたは手動で顧客を追加してください</p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/customers/import"
                  className="inline-flex items-center gap-2 border border-indigo-200 text-indigo-600 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  CSVインポート
                </Link>
                <Link
                  href="/customers/new"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  顧客を追加
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
