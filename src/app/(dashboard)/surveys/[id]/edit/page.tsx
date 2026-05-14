import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getSurveyById } from "@/lib/db/queries/surveys";
import SurveyEditForm from "./SurveyEditForm";

export default async function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <SurveyEditForm
      surveyId={id}
      initial={{
        title: survey.title,
        description: survey.description ?? "",
        thank_you_message: survey.thankYouMessage ?? "ご回答ありがとうございました！",
        category: survey.category ?? "general",
        status: survey.status,
        payment_enabled: false,
        payment_amount: 0,
        questions: (questions ?? []).map((q) => ({
          id: q.id,
          question_type: q.questionType as "text" | "textarea" | "radio" | "checkbox" | "select" | "rating" | "number" | "email",
          title: q.title,
          description: q.description ?? "",
          is_required: q.isRequired,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          sort_order: q.sortOrder,
        })),
      }}
    />
  );
}
