import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getLandingPages, getLpSubmissionCount } from "@/lib/db/queries/landingPages";

export default async function LandingPagesPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const landingPages = await getLandingPages(db, orgId);

  // 各LPの申込数を取得
  const submissionCounts = await Promise.all(
    landingPages.map(async (lp) => ({
      id: lp.id,
      count: await getLpSubmissionCount(db, lp.id),
    }))
  );
  const countMap = Object.fromEntries(submissionCounts.map((s) => [s.id, s.count]));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LP管理</h1>
          <p className="text-sm text-gray-500 mt-1">ランディングページの作成・管理を行います</p>
        </div>
        <Link
          href="/landing-pages/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          LPを作成
        </Link>
      </div>

      {/* List */}
      {landingPages.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          {landingPages.map((lp) => (
            <Link
              key={lp.id}
              href={`/landing-pages/${lp.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 truncate">{lp.title}</h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      lp.isPublished
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {lp.isPublished ? "公開中" : "非公開"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span>/{lp.slug}</span>
                  <span>申込数: {countMap[lp.id] ?? 0}</span>
                  <span>{new Date(lp.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">まだLPがありません</h3>
          <p className="text-sm text-gray-400 mb-6">
            最初のランディングページを作成して、申し込み受付を始めましょう
          </p>
          <Link
            href="/landing-pages/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            LPを作成する
          </Link>
        </div>
      )}
    </div>
  );
}
