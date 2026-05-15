import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getSurveyById, getSurveyResponses } from "@/lib/db/queries/surveys";

export default async function SurveyResponsesPage({ params }: { params: Promise<{ id: string }> }) {
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

  const responses = await getSurveyResponses(db, survey.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/surveys/${survey.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-sm text-gray-500">回答一覧（{responses.length}件）</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {responses.length > 0 ? (
          <div className="space-y-2">
            {responses.map((response) => (
              <Link
                key={response.id}
                href={`/surveys/${survey.id}/responses/${response.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {response.respondentName || response.respondentEmail || "匿名"}
                  </p>
                  {response.respondentName && response.respondentEmail && (
                    <p className="text-xs text-gray-400 mt-0.5">{response.respondentEmail}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(response.submittedAt)}</p>
                </div>
                <span className="text-xs text-indigo-600 font-medium">詳細</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">まだ回答がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
