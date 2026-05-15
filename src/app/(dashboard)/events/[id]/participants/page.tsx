import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEventById, getEventRegistrations } from "@/lib/db/queries/events";

const statusLabels: Record<string, string> = {
  registered: "申込済",
  confirmed: "確定",
  cancelled: "キャンセル",
  attended: "出席",
  no_show: "欠席",
};

const statusColors: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  attended: "bg-emerald-100 text-emerald-700",
  no_show: "bg-gray-100 text-gray-500",
};

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const event = await getEventById(db, orgId, id);
  if (!event) notFound();

  const registrations = await getEventRegistrations(db, event.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/events/${event.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">参加者一覧</h1>
          <p className="text-sm text-gray-500">{event.title}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
          <p className="text-sm text-gray-500">申込者数</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {registrations.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">名前</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">メール</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">申込日時</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => {
                const statusColor = statusColors[reg.status] || statusColors.registered;
                const statusLabel = statusLabels[reg.status] || reg.status;
                return (
                  <tr key={reg.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {reg.fullName || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{reg.email}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {reg.registeredAt ? formatDateTime(reg.registeredAt) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">まだ参加者がいません</p>
          </div>
        )}
      </div>
    </div>
  );
}
