import { notFound } from "next/navigation";
import { getDbFromContext } from "@/lib/db";
import { getSurveyById, getSurveyQuestions } from "@/lib/db/queries/surveys";
import SurveyForm from "./SurveyForm";

export default async function PublicSurveyPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const db = getDbFromContext();

  const survey = await getSurveyById(db, surveyId);

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

  // 期限チェック
  if (survey.deadline && Math.floor(Date.now() / 1000) > survey.deadline) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ⏰
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">受付は終了しました</h2>
          <p className="text-gray-400">このアンケートの回答期限を過ぎています</p>
        </div>
      </div>
    );
  }

  const questions = survey.questions;

  return (
    <SurveyForm
      survey={{
        id: survey.id,
        organization_id: survey.organizationId,
        title: survey.title,
        description: survey.description ?? null,
        thank_you_message: survey.thankYouMessage ?? null,
        is_anonymous: survey.isAnonymous ?? false,
        payment_enabled: survey.paymentEnabled ?? false,
        payment_amount: survey.paymentAmount ?? 0,
      }}
      questions={(questions ?? []).map((q) => ({
        id: q.id,
        question_type: q.questionType,
        title: q.title,
        description: q.description ?? null,
        is_required: q.isRequired,
        options: Array.isArray(q.options) ? (q.options as string[]) : null,
      }))}
    />
  );
}
