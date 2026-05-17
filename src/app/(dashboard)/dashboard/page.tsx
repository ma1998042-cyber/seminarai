import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getPendingInvitationsByEmail } from "@/lib/db/queries/invitations";
import { events, customers, surveys, emailCampaigns } from "@/lib/db/schema";
import CreateOrgCard from "./CreateOrgCard";
import { EmailTrackingChart } from "./EmailTrackingChart";
import { AiSegmentSuggestions } from "./AiSegmentSuggestions";
import { getDailyEmailTrackingStats } from "@/lib/db/queries/campaigns";
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
  const auth = getAuth();
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);

  const orgId = profile?.currentOrganizationId;
  if (!orgId) {
    const invitations = user.email
      ? await getPendingInvitationsByEmail(db, user.email)
      : [];
    const pendingInvitations = invitations.map((inv) => ({
      token: inv.token,
      role: inv.role,
      organizationName: inv.organization.name,
    }));
    return <CreateOrgCard pendingInvitations={pendingInvitations} />;
  }

  // Fetch stats (counts)
  const [eventsResult, customersResult, surveysResult, campaignsResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(events).where(eq(events.organizationId, orgId)),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.organizationId, orgId)),
    db.select({ count: sql<number>`count(*)` }).from(surveys).where(eq(surveys.organizationId, orgId)),
    db.select({ count: sql<number>`count(*)` }).from(emailCampaigns).where(eq(emailCampaigns.organizationId, orgId)),
  ]);

  const eventsCount = eventsResult[0]?.count ?? 0;
  const customersCount = customersResult[0]?.count ?? 0;
  const surveysCount = surveysResult[0]?.count ?? 0;
  const campaignsCount = campaignsResult[0]?.count ?? 0;

  // Email tracking stats (last 7 days)
  const emailTrackingData = await getDailyEmailTrackingStats(db, orgId, 7);

  // Recent events
  const recentEvents = await db.query.events.findMany({
    where: eq(events.organizationId, orgId),
    columns: { id: true, title: true, status: true, startDate: true, registrationCount: true },
    orderBy: (events, { desc }) => [desc(events.createdAt)],
    limit: 5,
  });

  // Recent customers
  const recentCustomers = await db.query.customers.findMany({
    where: eq(customers.organizationId, orgId),
    columns: { id: true, fullName: true, email: true, createdAt: true },
    orderBy: (customers, { desc }) => [desc(customers.createdAt)],
    limit: 5,
  });

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

      {/* Email tracking chart */}
      <EmailTrackingChart data={emailTrackingData} />

      {/* AI Segment Suggestions */}
      <AiSegmentSuggestions />

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
                        参加者 {event.registrationCount}名
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
                      {(customer.fullName || customer.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {customer.fullName || "名前なし"}
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
