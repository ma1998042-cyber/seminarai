import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getSurveyById, getSurveyResponses } from "@/lib/db/queries/surveys";
import { getTags } from "@/lib/db/queries/tags";
import ResponsesFilterTable from "./ResponsesFilterTable";

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
  const orgTags = await getTags(db, profile.currentOrganizationId!);

  const questions = (survey.questions ?? []).map((q) => ({
    id: q.id,
    sortOrder: q.sortOrder,
    questionType: q.questionType,
    title: q.title,
    options: q.options as unknown[] | null,
  }));

  const serializedResponses = responses.map((r) => ({
    id: r.id,
    respondentName: r.respondentName,
    respondentEmail: r.respondentEmail,
    answers: r.answers as Record<string, unknown>,
    submittedAt: r.submittedAt,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/surveys/${survey.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-sm text-gray-500">回答一覧</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <ResponsesFilterTable
          surveyId={survey.id}
          organizationId={survey.organizationId}
          questions={questions}
          responses={serializedResponses}
          tags={orgTags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
        />
      </div>
    </div>
  );
}
