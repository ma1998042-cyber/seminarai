import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, CheckCircle, ArrowRight, Zap } from "lucide-react";
import { formatDate, formatPrice, PLAN_COLORS, cn } from "@/lib/utils";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.current_organization_id;
  if (!orgId) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("*, plans(*)")
    .eq("id", orgId)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .single();

  const { data: billingHistory } = await supabase
    .from("billing_history")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: allPlans } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const currentPlan = (org as any)?.plans;
  const planName = currentPlan?.name || "free";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">プラン・課金</h1>
        <p className="text-sm text-gray-500 mt-1">サブスクリプションと請求履歴を管理します</p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">現在のプラン</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{currentPlan?.display_name || "Free"}</h3>
                <span className={cn("text-xs px-2 py-1 rounded-full font-medium", PLAN_COLORS[planName])}>
                  {planName === "free" ? "無料プラン" : "有料プラン"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {planName !== "free"
                  ? `${formatPrice(currentPlan?.price_monthly || 0)}/月`
                  : "無料でご利用中"}
              </p>
              {subscription?.current_period_end && (
                <p className="text-xs text-gray-400 mt-0.5">
                  次回更新：{formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>
          </div>
          {planName !== "enterprise" && (
            <Link
              href="/pricing"
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              アップグレード
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Plan limits */}
        {currentPlan && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "イベント", value: currentPlan.max_events === -1 ? "無制限" : `${currentPlan.max_events}件` },
              { label: "顧客", value: currentPlan.max_customers === -1 ? "無制限" : `${currentPlan.max_customers.toLocaleString()}件` },
              { label: "月間メール", value: currentPlan.max_monthly_emails === -1 ? "無制限" : `${currentPlan.max_monthly_emails.toLocaleString()}通` },
              { label: "メンバー", value: currentPlan.max_members === -1 ? "無制限" : `${currentPlan.max_members}名` },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">プラン比較</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {allPlans?.map((plan) => {
            const isCurrentPlan = plan.name === planName;
            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl p-5 border",
                  isCurrentPlan ? "border-indigo-500 bg-indigo-50" : "border-gray-100"
                )}
              >
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{plan.display_name}</h3>
                    {isCurrentPlan && (
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">現在</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {plan.price_monthly === 0 ? "無料" : `¥${plan.price_monthly.toLocaleString()}/月`}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {(plan.features as string[]).map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!isCurrentPlan && plan.name !== "enterprise" && (
                  <button className="mt-4 w-full py-2 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition-colors">
                    このプランへ変更
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing history */}
      {billingHistory && billingHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 p-5 border-b border-gray-50">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">請求履歴</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {billingHistory.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">{invoice.description || "サブスクリプション"}</p>
                  <p className="text-xs text-gray-400">{formatDate(invoice.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(invoice.amount)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${invoice.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {invoice.status === "paid" ? "支払済" : invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
