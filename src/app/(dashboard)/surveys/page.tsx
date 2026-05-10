import { createAdminClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardList, MessageSquare, ExternalLink, Search } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import SurveySearch from "./SurveySearch";

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; event?: string; status?: string }>;
}) {
  const { q, event, status } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin.from("user_profiles").select("current_organization_id").eq("id", user.id).single();
  const orgId = profile?.current_organization_id;
  if (!orgId) redirect("/dashboard");

  let query = admin
    .from("surveys")
    .select("*, events(id, title)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);
  if (event) query = query.eq("event_id", event);
  if (status) query = query.eq("status", status);

  const { data: surveys } = await query;

  const { data: events } = await admin
    .from("events")
    .select("id, title")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-500",
    archived: "bg-amber-100 text-amber-700",
  };
  const statusLabels: Record<string, string> = {
    draft: "下書き", active: "公開中", closed: "終了", archived: "アーカイブ",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">アンケート管理</h1>
          <p className="text-sm text-gray-500 mt-1">参加者の声を集めて顧客理解を深めましょう</p>
        </div>
        <Link
          href="/surveys/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          アンケートを作成
        </Link>
      </div>

      <SurveySearch events={events ?? []} currentQ={q} currentEvent={event} currentStatus={status} />

      {surveys && surveys.length > 0 ? (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group">
              <Link href={`/surveys/${survey.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{survey.title}</h3>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", statusColors[survey.status] || statusColors.draft)}>
                      {statusLabels[survey.status] || survey.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {(survey as any).events && <span>📅 {(survey as any).events.title}</span>}
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{survey.response_count}件の回答</span>
                    <span>{formatDate(survey.created_at)}</span>
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/surveys/${survey.id}/edit`}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  編集
                </Link>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">
            {q || event || status ? "条件に一致するアンケートがありません" : "まだアンケートがありません"}
          </h3>
          {!q && !event && !status && (
            <>
              <p className="text-sm text-gray-400 mb-6">アンケートを作成して、参加者の声を集めましょう</p>
              <Link href="/surveys/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />アンケートを作成する
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
