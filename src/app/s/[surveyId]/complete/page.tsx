import Stripe from "stripe";
import { CheckCircle, XCircle } from "lucide-react";
import { getDbFromContext } from "@/lib/db";
import { getSurveyById, incrementSurveyResponseCount } from "@/lib/db/queries/surveys";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export default async function SurveyCompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ session_id?: string; response_id?: string }>;
}) {
  const { surveyId } = await params;
  const { session_id, response_id } = await searchParams;

  if (!session_id || !response_id) {
    return <ErrorPage message="無効なリクエストです" />;
  }

  const db = getDbFromContext();

  // Verify payment with Stripe
  let paid = false;
  let thankYouMessage = "ご回答・お支払いありがとうございました！";

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    paid = session.payment_status === "paid";

    if (paid) {
      // Increment response_count
      const survey = await getSurveyById(db, surveyId);

      if (survey) {
        thankYouMessage = survey.thankYouMessage || thankYouMessage;
        await incrementSurveyResponseCount(db, surveyId);
      }
    }
  } catch {
    return <ErrorPage message="決済の確認中にエラーが発生しました" />;
  }

  if (!paid) {
    return <ErrorPage message="決済が完了していません" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{thankYouMessage}</h2>
        <p className="text-gray-400 text-sm">このページを閉じていただいて構いません</p>
      </div>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">{message}</h2>
        <p className="text-gray-400 text-sm">お手数ですが、もう一度お試しください</p>
      </div>
    </div>
  );
}
