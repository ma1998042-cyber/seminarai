import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import CampaignNav from "@/components/campaigns/CampaignNav";
import { formatDate } from "@/lib/utils";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin.from("user_profiles").select("current_organization_id").eq("id", user.id).single();
  const orgId = profile?.current_organization_id;
  if (!orgId) redirect("/onboarding");

  const { data: templates } = await admin
    .from("email_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

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
                <p className="text-xs text-gray-400 mt-1">{formatDate(tmpl.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
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
