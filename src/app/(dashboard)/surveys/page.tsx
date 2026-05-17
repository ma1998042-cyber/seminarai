import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, and, like, desc, count } from "drizzle-orm";
import { Plus, ClipboardList, MessageSquare, ExternalLink, Search, Clock, Trash2 } from "lucide-react";
import { formatDate, cn, SURVEY_CATEGORY_LABELS } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getEvents } from "@/lib/db/queries/events";
import { surveys as surveysTable } from "@/lib/db/schema";
import SurveySearch from "./SurveySearch";
import DeleteSurveyButton from "./[id]/DeleteSurveyButton";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; event?: string; status?: string; page?: string }>;
}) {
  const { q, event, status, page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/dashboard");

  const conditions = [eq(surveysTable.organizationId, orgId)];
  if (q) conditions.push(like(surveysTable.title, `%${q}%`));
  if (event) conditions.push(eq(surveysTable.eventId, event));
  if (status) conditions.push(eq(surveysTable.status, status));

  const [surveys, countResult] = await Promise.all([
    db.query.surveys.findMany({
      where: and(...conditions),
      orderBy: (s, { desc: d }) => [d(s.createdAt)],
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    }),
    db.select({ value: count() }).from(surveysTable).where(and(...conditions)),
  ]);

  const totalCount = countResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const eventsList = await getEvents(db, orgId);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-500",
    archived: "bg-amber-100 text-amber-700",
  };
  const statusLabels: Record<string, string> = {
    draft: "下書き", active: "公開中", closed: "終了", archived: "アーカイブ",
  };
  const categoryColors: Record<string, string> = {
    pre_event: "bg-blue-100 text-blue-700",
    post_event: "bg-green-100 text-green-700",
    registration: "bg-purple-100 text-purple-700",
    general: "bg-gray-100 text-gray-500",
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

      <SurveySearch events={eventsList.map(e => ({ id: e.id, title: e.title }))} currentQ={q} currentEvent={event} currentStatus={status} />

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
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", categoryColors[survey.category] || categoryColors.general)}>
                      {SURVEY_CATEGORY_LABELS[survey.category] || survey.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{survey.responseCount}件の回答</span>
                    <span>{formatDate(survey.createdAt)}</span>
                    {survey.deadline && (
                      <span className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                        Math.floor(Date.now() / 1000) > survey.deadline
                          ? "text-red-600 bg-red-50"
                          : "text-gray-500 bg-gray-100"
                      )}>
                        <Clock className="w-3 h-3" />
                        {Math.floor(Date.now() / 1000) > survey.deadline ? "期限切れ" : `〜${new Date(survey.deadline * 1000).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    )}
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
                <DeleteSurveyButton surveyId={survey.id} variant="icon" redirectTo="/surveys" />
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

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
