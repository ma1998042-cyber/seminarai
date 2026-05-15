import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus, FileText, Pencil, Send } from "lucide-react";
import CampaignNav from "@/components/campaigns/CampaignNav";
import { formatDate } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { eq } from "drizzle-orm";
import { emailTemplates } from "@/lib/db/schema";

export default async function TemplatesPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const templates = await db.query.emailTemplates.findMany({
    where: eq(emailTemplates.organizationId, orgId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メルマガ配信</h1>
        </div>
        <Link
          href="/campaigns/templates/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          テンプレートを作成
        </Link>
      </div>

      <CampaignNav />

      {templates && templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{tmpl.name}</h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">{tmpl.subject}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(tmpl.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/campaigns/new?template=${tmpl.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  配信作成
                </Link>
                <Link
                  href={`/campaigns/templates/${tmpl.id}`}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">テンプレートがありません</h3>
          <p className="text-sm text-gray-400 mb-6">よく使うメール文面をテンプレートとして保存しましょう</p>
          <Link
            href="/campaigns/templates/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            最初のテンプレートを作成する
          </Link>
        </div>
      )}
    </div>
  );
}
