import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SurveyForm from "./SurveyForm";

export default async function PublicSurveyPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const admin = await createAdminClient();

  const { data: survey } = await admin
    .from("surveys")
    .select("id, organization_id, title, description, thank_you_message, status, is_anonymous, payment_enabled, payment_amount")
    .eq("id", surveyId)
    .single();

  if (!survey || survey.status !== "active") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">アンケートを表示できません</h2>
          <p className="text-gray-400">このアンケートは現在受付していません</p>
        </div>
      </div>
    );
  }

  const { data: questions } = await admin
    .from("survey_questions")
    .select("id, question_type, title, description, is_required, options")
    .eq("survey_id", surveyId)
    .order("sort_order");

  return (
    <SurveyForm
      survey={{
        ...survey,
        is_anonymous: survey.is_anonymous ?? false,
        payment_enabled: survey.payment_enabled ?? false,
        payment_amount: survey.payment_amount ?? 0,
      }}
      questions={(questions ?? []).map((q) => ({
        ...q,
        description: q.description ?? null,
        options: Array.isArray(q.options) ? (q.options as string[]) : null,
      }))}
    />
  );
}
