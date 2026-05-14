import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getCustomerById, getCustomerRegistrations } from "@/lib/db/queries/customers";
import { getTags } from "@/lib/db/queries/tags";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
import CustomerEditForm from "./CustomerEditForm";
import TagManager from "./TagManager";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  unsubscribed: "bg-gray-100 text-gray-500",
  bounced: "bg-red-100 text-red-600",
  blocked: "bg-red-100 text-red-600",
};
const statusLabels: Record<string, string> = {
  active: "有効",
  unsubscribed: "配信停止",
  bounced: "バウンス",
  blocked: "ブロック",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/dashboard");

  const customer = await getCustomerById(db, orgId, id);
  if (!customer) notFound();

  const allTags = await getTags(db, orgId);

  const registrations = await getCustomerRegistrations(db, id, { limit: 5 });

  const customerTags = (customer.customerTags as any[])
    ?.map((ct: any) => ct.tag)
    .filter(Boolean) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.fullName || "名前なし"}
              </h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusColors[customer.status] || statusColors.active)}>
                {statusLabels[customer.status] || customer.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Edit form */}
          <CustomerEditForm
            customerId={id}
            initial={{
              full_name: customer.fullName ?? "",
              email: customer.email,
              phone: customer.phone ?? "",
              company: customer.company ?? "",
              job_title: customer.jobTitle ?? "",
              notes: customer.notes ?? "",
              status: customer.status,
            }}
          />

          {/* Event history */}
          {registrations && registrations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">参加イベント履歴</h2>
              <div className="space-y-2">
                {registrations.map((reg: any) => (
                  <Link
                    key={reg.id}
                    href={`/events/${reg.event?.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{reg.event?.title}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(reg.registeredAt)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{reg.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tag manager */}
          <TagManager
            customerId={id}
            currentTags={customerTags}
            allTags={allTags ?? []}
          />

          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">詳細情報</h3>
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {customer.phone}
              </div>
            )}
            {customer.company && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 text-gray-400" />
                {customer.company}
              </div>
            )}
            {customer.jobTitle && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4 text-gray-400" />
                {customer.jobTitle}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              {customer.email}
            </div>
            <div className="pt-2 border-t border-gray-50 text-xs text-gray-400 space-y-1">
              <p>登録日：{formatDateTime(customer.createdAt)}</p>
              {customer.source && <p>流入元：{customer.source}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
