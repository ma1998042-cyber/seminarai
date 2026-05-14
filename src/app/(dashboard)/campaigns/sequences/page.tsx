import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, GitBranch, ExternalLink } from "lucide-react";
import CampaignNav from "@/components/campaigns/CampaignNav";
import { formatDate, cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { eq } from "drizzle-orm";
import { stepCampaigns } from "@/lib/db/schema";

export default async function SequencesPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const sequences = await db.query.stepCampaigns.findMany({
    where: eq(stepCampaigns.organizationId, orgId),
    with: {
      steps: true,
      enrollments: true,
    },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    paused: "bg-amber-100 text-amber-700",
    archived: "bg-gray-100 text-gray-400",
  };
  const statusLabels: Record<string, string> = {
    draft: "下書き", active: "稼働中", paused: "一時停止", archived: "アーカイブ",
  };
  const triggerLabels: Record<string, string> = {
    manual: "手動登録", event_registration: "イベント参加時", tag_added: "タグ追加時",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メルマガ配信</h1>
        </div>
        <Link
          href="/campaigns/sequences/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          シーケンスを作成
        </Link>
      </div>

      <CampaignNav />

      {sequences && sequences.length > 0 ? (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const stepCount = seq.steps?.length ?? 0;
            const enrollCount = seq.enrollments?.length ?? 0;
            return (
              <Link
                key={seq.id}
                href={`/campaigns/sequences/${seq.id}`}
                className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{seq.name}</h3>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", statusColors[seq.status] ?? statusColors.draft)}>
                      {statusLabels[seq.status] ?? seq.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>トリガー: {triggerLabels[seq.triggerType] ?? seq.triggerType}</span>
                    <span>{stepCount}ステップ</span>
                    <span>{enrollCount}名登録中</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(seq.createdAt)}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <GitBranch className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">ステップ配信がありません</h3>
          <p className="text-sm text-gray-400 mb-6">登録後、日数に応じて自動でメールを配信できます</p>
          <Link
            href="/campaigns/sequences/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            最初のシーケンスを作成する
          </Link>
        </div>
      )}
    </div>
  );
}
