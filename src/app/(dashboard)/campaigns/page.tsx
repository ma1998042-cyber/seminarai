import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, Mail, Send, Eye, MousePointer, ExternalLink } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import CampaignNav from "@/components/campaigns/CampaignNav";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCampaigns } from "@/lib/db/queries/campaigns";

export default async function CampaignsPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const campaigns = await getCampaigns(db, orgId);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    canceled: "bg-red-100 text-red-500",
  };

  const statusLabels: Record<string, string> = {
    draft: "下書き",
    scheduled: "予約済み",
    sending: "送信中",
    sent: "送信済み",
    canceled: "キャンセル",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メルマガ配信</h1>
          <p className="text-sm text-gray-500 mt-1">顧客にターゲットを絞ったメールを配信します</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          メルマガを作成
        </Link>
      </div>

      <CampaignNav />

      {campaigns && campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{campaign.title}</h3>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", statusColors[campaign.status] || statusColors.draft)}>
                    {statusLabels[campaign.status] || campaign.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{campaign.subject}</p>
                {campaign.status === "sent" && (
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      {campaign.sentCount}件送信
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      開封率 {campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0}%
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      クリック率 {campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0}%
                    </span>
                  </div>
                )}
                {campaign.scheduledAt && campaign.status === "scheduled" && (
                  <p className="text-xs text-blue-500">{formatDate(campaign.scheduledAt)} 送信予定</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">{formatDate(campaign.createdAt)}</p>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-2 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Mail className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">まだメルマガがありません</h3>
          <p className="text-sm text-gray-400 mb-6">
            顧客にパーソナライズされたメールを送りましょう
          </p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            最初のメルマガを作成する
          </Link>
        </div>
      )}
    </div>
  );
}
