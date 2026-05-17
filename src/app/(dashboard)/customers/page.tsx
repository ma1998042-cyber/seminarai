import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCustomers, getCustomerSurveyResponseCounts, countCustomers } from "@/lib/db/queries/customers";
import { getTags } from "@/lib/db/queries/tags";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Tag, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import CustomerSearch from "./CustomerSearch";
import CustomerTable from "./CustomerTable";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; status?: string; page?: string }>;
}) {
  const { q, tag, status, page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

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

  // Build customer query with DB-side tag filter
  const filterOptions = { search: q, status, tagId: tag };
  const [customerList, totalCount] = await Promise.all([
    getCustomers(db, orgId, {
      ...filterOptions,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
      withTags: true,
    }),
    countCustomers(db, orgId, filterOptions),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // アンケート回答数を取得
  const emails = customerList.map((c: any) => c.email).filter(Boolean);
  const surveyCountMap = await getCustomerSurveyResponseCounts(db, orgId, emails);

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
          <p className="text-sm text-gray-500 mt-1">{totalCount ?? 0}名の顧客</p>
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

      {customerList.length > 0 ? (
        <CustomerTable
          customerList={customerList as any}
          surveyCountMap={surveyCountMap}
          statusColors={statusColors}
          statusLabels={statusLabels}
        />
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

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
