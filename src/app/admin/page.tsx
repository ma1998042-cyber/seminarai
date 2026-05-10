import { createClient } from "@/lib/supabase/server";
import { Building2, Users, Mail, CreditCard, TrendingUp } from "lucide-react";
import { formatNumber, formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: orgCount },
    { count: userCount },
    { data: recentOrgs },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("organizations")
      .select("id, name, slug, created_at, plans(name, display_name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("billing_history")
      .select("amount")
      .eq("status", "paid"),
  ]);

  const totalRevenue = revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;

  const stats = [
    { label: "契約組織数", value: orgCount || 0, icon: Building2, color: "text-indigo-400", bg: "bg-indigo-900/50" },
    { label: "ユーザー数", value: userCount || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-900/50" },
    { label: "累計売上", value: formatPrice(totalRevenue), icon: CreditCard, color: "text-green-400", bg: "bg-green-900/50", isString: true },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
        <p className="text-gray-400 text-sm mt-1">SeminarFlow サービス全体の概要</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {stat.isString ? stat.value : formatNumber(stat.value as number)}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent organizations */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700">
        <div className="flex items-center gap-2 p-5 border-b border-gray-700">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-white">最近登録した組織</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {recentOrgs?.map((org: any) => (
            <div key={org.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-white">{org.name}</p>
                <p className="text-xs text-gray-400">{org.slug}</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                  {org.plans?.display_name || "Free"}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(org.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
