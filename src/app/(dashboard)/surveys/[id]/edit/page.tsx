import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import SurveyEditForm from "./SurveyEditForm";

export default async function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin.from("user_profiles").select("current_organization_id").eq("id", user.id).single();

  const { data: survey } = await admin.from("surveys").select("*, payment_enabled, payment_amount").eq("id", id).single();
  if (!survey) notFound();
  if (profile?.current_organization_id !== survey.organization_id) redirect("/surveys");

  const { data: questions } = await admin
    .from("survey_questions")
    .select("*")
    .eq("survey_id", id)
    .order("sort_order");

  return (
    <SurveyEditForm
      surveyId={id}
      initial={{
        title: survey.title,
        description: survey.description ?? "",
        thank_you_message: survey.thank_you_message ?? "ご回答ありがとうございました！",
        status: survey.status,
        payment_enabled: survey.payment_enabled ?? false,
        payment_amount: survey.payment_amount ?? 0,
        questions: (questions ?? []).map((q) => ({
          id: q.id,
          question_type: q.question_type,
          title: q.title,
          description: q.description ?? "",
          is_required: q.is_required,
          options: Array.isArray(q.options) ? q.options : [],
          sort_order: q.sort_order,
        })),
      }}
    />
  );
}
