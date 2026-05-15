import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ExternalLink, BarChart3, Clock } from "lucide-react";
import CopyUrlButton from "./CopyUrlButton";
import { formatDateTime, cn } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getSurveyById, getSurveyQuestions, getSurveyResponses } from "@/lib/db/queries/surveys";

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const questions = survey.questions;

  const responses = await getSurveyResponses(db, survey.id);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/s/${survey.id}`;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-500",
  };

  const statusLabels: Record<string, string> = {
    draft: "下書き",
    active: "公開中",
    closed: "終了",
  };

  const questionTypeLabels: Record<string, string> = {
    text: "テキスト",
    textarea: "長文テキスト",
    radio: "単一選択",
    checkbox: "複数選択",
    select: "ドロップダウン",
    rating: "評価",
    number: "数値",
    email: "メールアドレス",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/surveys" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusColors[survey.status] || statusColors.draft)}>
                {statusLabels[survey.status] || survey.status}
              </span>
            </div>
            {survey.eventId && (
              <p className="text-sm text-gray-500">イベント紐づけ済み</p>
            )}
          </div>
        </div>
        <Link
          href={`/surveys/${survey.id}/edit`}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          編集
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Share URL */}
          {survey.status === "active" && (
            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
              <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                アンケートURL
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm text-gray-700 border border-indigo-200 truncate">
                  {publicUrl}
                </code>
                <CopyUrlButton url={publicUrl} />
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">設問一覧（{questions?.length || 0}問）</h2>
            <div className="space-y-3">
              {questions?.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="w-7 h-7 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800">{q.title}</p>
                      {q.isRequired && (
                        <span className="text-xs text-red-500">必須</span>
                      )}
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {questionTypeLabels[q.questionType] || q.questionType}
                    </span>
                    {q.options && Array.isArray(q.options) && (q.options as string[]).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(q.options as string[]).map((opt: string, j: number) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                            <span className="text-xs text-gray-500">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent responses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">最近の回答</h2>
              <Link href={`/surveys/${survey.id}/responses`} className="text-sm text-indigo-600 hover:underline">
                すべて見る
              </Link>
            </div>
            {responses && responses.length > 0 ? (
              <div className="space-y-2">
                {responses.map((response) => (
                  <div key={response.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {response.respondentName || response.respondentEmail || "匿名"}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateTime(response.submittedAt)}</p>
                    </div>
                    <Link
                      href={`/surveys/${survey.id}/responses/${response.id}`}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      詳細
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">まだ回答がありません</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{survey.responseCount}</p>
                <p className="text-sm text-gray-500">回答数</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">アンケート情報</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">設問数</span>
                <span className="text-gray-700">{questions?.length || 0}問</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">作成日</span>
                <span className="text-gray-700">{formatDateTime(survey.createdAt)}</span>
              </div>
              {survey.publishedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">公開日</span>
                  <span className="text-gray-700">{formatDateTime(survey.publishedAt)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">回答期限</span>
                {survey.deadline ? (
                  <span className={cn(
                    "text-sm font-medium",
                    Math.floor(Date.now() / 1000) > survey.deadline ? "text-red-600" : "text-gray-700"
                  )}>
                    {formatDateTime(new Date(survey.deadline * 1000))}
                    {Math.floor(Date.now() / 1000) > survey.deadline && (
                      <span className="ml-1 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">期限切れ</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">なし</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
