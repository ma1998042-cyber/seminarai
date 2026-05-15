import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, User, Mail, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getSurveyById, getSurveyResponseById } from "@/lib/db/queries/surveys";

export default async function SurveyResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string; responseId: string }>;
}) {
  const { id, responseId } = await params;
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);

  const survey = await getSurveyById(db, id);
  if (!survey) notFound();
  if (profile?.currentOrganizationId !== survey.organizationId) redirect("/surveys");

  const response = await getSurveyResponseById(db, responseId);
  if (!response || response.surveyId !== survey.id) notFound();

  const questions = survey.questions || [];
  const answers = (response.answers || {}) as Record<string, unknown>;

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/surveys/${survey.id}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">回答詳細</h1>
          <p className="text-sm text-gray-500">{survey.title}</p>
        </div>
      </div>

      {/* Respondent info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">回答者情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">回答者名</p>
              <p className="text-sm font-medium text-gray-700">
                {response.respondentName || "未入力"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">メールアドレス</p>
              <p className="text-sm font-medium text-gray-700">
                {response.respondentEmail || "未入力"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">回答日時</p>
              <p className="text-sm font-medium text-gray-700">
                {formatDateTime(response.submittedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          回答内容（{questions.length}問）
        </h2>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const answer = answers[q.id];
            return (
              <div
                key={q.id}
                className="p-4 bg-gray-50 rounded-xl space-y-2"
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800">
                        {q.title}
                      </p>
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                        {questionTypeLabels[q.questionType] || q.questionType}
                      </span>
                      {q.isRequired && (
                        <span className="text-xs text-red-500">必須</span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
                      {answer === undefined || answer === null || answer === "" ? (
                        <span className="text-gray-400">未回答</span>
                      ) : Array.isArray(answer) ? (
                        <ul className="list-disc list-inside space-y-1">
                          {answer.map((item, j) => (
                            <li key={j}>{String(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>{String(answer)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
