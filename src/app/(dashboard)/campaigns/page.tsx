import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus } from "lucide-react";
import CampaignNav from "@/components/campaigns/CampaignNav";
import CampaignList from "@/components/campaigns/CampaignList";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCampaigns } from "@/lib/db/queries/campaigns";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const allCampaigns = await getCampaigns(db, orgId);
  const campaigns = status
    ? allCampaigns.filter((c) => c.status === status)
    : allCampaigns;

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

      <CampaignList campaigns={campaigns} currentStatus={status} />
    </div>
  );
}
