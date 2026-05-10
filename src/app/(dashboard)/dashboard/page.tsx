import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateOrgCard from "./CreateOrgCard";
import {
  CalendarDays,
  Users,
  ClipboardList,
  Mail,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.current_organization_id;
  if (!orgId) return <CreateOrgCard />;

  // Fetch stats
  const [
    { count: eventsCount },
    { count: customersCount },
    { count: surveysCount },
    { count: campaignsCount },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("surveys").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("email_campaigns").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

  // Recent events
  const { data: recentEvents } = await supabase
    .from("events")
    .select("id, title, status, start_date, registration_count")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent customers
  const { data: recentCustomers } = await supabase
    .from("customers")
    .select("id, full_name, email, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "イベント", value: eventsCount || 0, icon: CalendarDays, color: "text-indigo-600", bg: "bg-indigo-50", href: "/events" },
    { label: "顧客", value: customersCount || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/customers" },
    { label: "アンケート", value: surveysCount || 0, icon: ClipboardList, color: "text-green-600", bg: "bg-green-50", href: "/surveys" },
    { label: "メルマガ", value: campaignsCount || 0, icon: Mail, color: "text-purple-600", bg: "bg-purple-50", href: "/campaigns" },
  ];

  const statusLabels: Record<string, { label: string; className: string }> = {
    draft: { label: "下書き", className: "bg-gray-100 text-gray-600" },
    active: { label: "公開中", className: "bg-green-100 text-green-700" },
    closed: { label: "終了", className: "bg-gray-100 text-gray-500" },
    archived: { label: "アーカイブ", className: "bg-amber-100 text-amber-700" },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stat.value)}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">追客フローを始めよう</h2>
            <p className="text-indigo-200 text-sm mt-1">イベントを作成してアンケートを収集しましょう</p>
          </div>
          <TrendingUp className="w-8 h-8 text-indigo-300" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/events/new"
            className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            イベントを作成
          </Link>
          <Link
            href="/surveys/new"
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            アンケートを作成
          </Link>
          <Link
            href="/campaigns/new"
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            メルマガを作成
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent events */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">最近のイベント</h2>
            <Link href="/events" className="text-sm text-indigo-600 hover:underline">すべて見る</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentEvents && recentEvents.length > 0 ? (
              recentEvents.map((event) => {
                const s = statusLabels[event.status] || statusLabels.draft;
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        参加者 {event.registration_count}名
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">イベントがまだありません</p>
                <Link href="/events/new" className="text-sm text-indigo-600 hover:underline mt-1 block">
                  最初のイベントを作成する
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent customers */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">最近の顧客</h2>
            <Link href="/customers" className="text-sm text-indigo-600 hover:underline">すべて見る</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCustomers && recentCustomers.length > 0 ? (
              recentCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">
                      {(customer.full_name || customer.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {customer.full_name || "名前なし"}
                    </p>
                    <p className="text-xs text-gray-400">{customer.email}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">顧客がまだいません</p>
                <Link href="/customers" className="text-sm text-indigo-600 hover:underline mt-1 block">
                  顧客を追加する
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
