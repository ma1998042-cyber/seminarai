import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, Briefcase, Pencil, Trash2 } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCaseStudies } from "@/lib/db/queries/caseStudies";
import CaseStudyToggle from "./CaseStudyToggle";
import CaseStudyDeleteButton from "./CaseStudyDeleteButton";

export default async function CasesListPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const cases = await getCaseStudies(db, orgId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">事例管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            事例の作成・編集・公開を管理します
          </p>
        </div>
        <Link
          href="/cases/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          事例を追加
        </Link>
      </div>

      {cases && cases.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  制作期間
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  費用
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  並び順
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  公開
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cases.map((cs) => (
                <tr key={cs.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/cases/${cs.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                    >
                      {cs.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cs.productionPeriod || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cs.productionCost || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cs.sortOrder}
                  </td>
                  <td className="px-6 py-4">
                    <CaseStudyToggle id={cs.id} isPublished={cs.isPublished} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/cases/${cs.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        編集
                      </Link>
                      <CaseStudyDeleteButton id={cs.id} title={cs.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">
            まだ事例がありません
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            最初の事例を追加しましょう
          </p>
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            事例を追加する
          </Link>
        </div>
      )}
    </div>
  );
}
