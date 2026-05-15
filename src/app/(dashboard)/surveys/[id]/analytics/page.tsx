import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, BarChart3, Users } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getSurveyById, getSurveyResponses } from "@/lib/db/queries/surveys";
import { formatDateTime } from "@/lib/utils";
import { ChoiceChart, RatingChart, type ChartData } from "./SurveyAnalyticsCharts";

export default async function SurveyAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  const survey = await getSurveyById(db, id);

  if (!survey) notFound();
  if (profile?.currentOrganizationId !== survey.organizationId) redirect("/surveys");

  const questions = survey.questions || [];
  const responses = await getSurveyResponses(db, survey.id);

  const now = Date.now();
  const day7 = now - 7 * 24 * 60 * 60 * 1000;
  const day30 = now - 30 * 24 * 60 * 60 * 1000;

  const total = responses.length;
  const last7 = responses.filter((r) => new Date(r.submittedAt).getTime() > day7).length;
  const last30 = responses.filter((r) => new Date(r.submittedAt).getTime() > day30).length;

  // Build per-question analytics
  const questionAnalytics = questions.map((q) => {
    const answers = responses
      .map((r) => (r.answers as Record<string, unknown>)?.[q.id])
      .filter((a) => a !== undefined && a !== null && a !== "");

    const type = q.questionType;
    const options = (q.options as string[]) || [];

    if (type === "radio" || type === "select") {
      const counts: Record<string, number> = {};
      for (const opt of options) counts[opt] = 0;
      for (const a of answers) {
        const key = String(a);
        counts[key] = (counts[key] || 0) + 1;
      }
      const chartData: ChartData[] = Object.entries(counts).map(([name, count]) => ({
        name,
        count,
        percentage: answers.length > 0 ? Math.round((count / answers.length) * 100) : 0,
      }));
      return { question: q, type: "choice" as const, data: chartData, total: answers.length };
    }

    if (type === "checkbox") {
      const counts: Record<string, number> = {};
      for (const opt of options) counts[opt] = 0;
      for (const a of answers) {
        const arr = Array.isArray(a) ? a : [a];
        for (const v of arr) {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      const chartData: ChartData[] = Object.entries(counts).map(([name, count]) => ({
        name,
        count,
        percentage: answers.length > 0 ? Math.round((count / answers.length) * 100) : 0,
      }));
      return { question: q, type: "choice" as const, data: chartData, total: answers.length };
    }

    if (type === "rating") {
      const nums = answers.map((a) => Number(a)).filter((n) => !isNaN(n));
      const avg = nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const n of nums) dist[n] = (dist[n] || 0) + 1;
      const chartData: ChartData[] = [1, 2, 3, 4, 5].map((v) => ({
        name: `${v}`,
        count: dist[v] || 0,
        percentage: nums.length > 0 ? Math.round(((dist[v] || 0) / nums.length) * 100) : 0,
      }));
      return { question: q, type: "rating" as const, data: chartData, avg: Math.round(avg * 10) / 10, total: nums.length };
    }

    // text, textarea, email, number
    const textAnswers = answers.map((a) => String(a));
    return { question: q, type: "text" as const, data: textAnswers, total: textAnswers.length };
  });

  const questionTypeLabels: Record<string, string> = {
    text: "テキスト", textarea: "長文テキスト", radio: "単一選択",
    checkbox: "複数選択", select: "ドロップダウン", rating: "評価",
    number: "数値", email: "メールアドレス",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/surveys/${survey.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-sm text-gray-500">回答分析</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "総回答数", value: total },
          { label: "直近7日", value: last7 },
          { label: "直近30日", value: last30 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-question analytics */}
      {questionAnalytics.map((qa, i) => (
        <div key={qa.question.id} className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600">
              {i + 1}
            </span>
            <h3 className="font-semibold text-gray-900">{qa.question.title}</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {questionTypeLabels[qa.question.questionType] || qa.question.questionType}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{qa.total}件の回答</span>
          </div>

          {qa.type === "choice" && <ChoiceChart data={qa.data} />}

          {qa.type === "rating" && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                平均スコア: <span className="text-xl font-bold text-indigo-600">{qa.avg}</span> / 5
              </p>
              <RatingChart data={qa.data} />
            </div>
          )}

          {qa.type === "text" && (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {qa.data.map((text, j) => (
                    <tr key={j} className="border-b border-gray-50">
                      <td className="py-2 px-3 text-gray-700">{text}</td>
                    </tr>
                  ))}
                  {qa.data.length === 0 && (
                    <tr>
                      <td className="py-4 text-center text-gray-400">回答なし</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Respondent List */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          回答者一覧
        </h2>
        {responses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">名前</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">メール</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">回答日時</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700">{r.respondentName || "—"}</td>
                    <td className="py-2 px-3 text-gray-700">{r.respondentEmail || "—"}</td>
                    <td className="py-2 px-3 text-gray-400">{formatDateTime(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-8 text-sm text-gray-400">まだ回答がありません</p>
        )}
      </div>
    </div>
  );
}
