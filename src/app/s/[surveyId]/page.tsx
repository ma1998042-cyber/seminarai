import { getDb, surveys, surveyQuestions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import SurveyForm from './SurveyForm'

export default async function PublicSurveyPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params
  const db = getDb()

  const survey = await db
    .select({
      id: surveys.id,
      organizationId: surveys.organizationId,
      title: surveys.title,
      description: surveys.description,
      thankYouMessage: surveys.thankYouMessage,
      status: surveys.status,
      isAnonymous: surveys.isAnonymous,
      paymentEnabled: surveys.paymentEnabled,
      paymentAmount: surveys.paymentAmount,
    })
    .from(surveys)
    .where(eq(surveys.id, surveyId))
    .get()

  if (!survey || survey.status !== 'active') {
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
    )
  }

  const questions = await db
    .select({
      id: surveyQuestions.id,
      questionType: surveyQuestions.questionType,
      title: surveyQuestions.title,
      description: surveyQuestions.description,
      isRequired: surveyQuestions.isRequired,
      options: surveyQuestions.options,
    })
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, surveyId))
    .orderBy(surveyQuestions.sortOrder)

  return (
    <SurveyForm
      survey={{
        id: survey.id,
        organization_id: survey.organizationId,
        title: survey.title,
        description: survey.description ?? null,
        thank_you_message: survey.thankYouMessage ?? null,
        status: survey.status,
        is_anonymous: survey.isAnonymous ?? false,
        payment_enabled: false,
        payment_amount: 0,
      }}
      questions={questions.map((q) => ({
        id: q.id,
        question_type: q.questionType,
        title: q.title,
        description: q.description ?? null,
        is_required: q.isRequired ?? false,
        options: q.options ? (JSON.parse(q.options) as string[]) : null,
      }))}
    />
  )
}
