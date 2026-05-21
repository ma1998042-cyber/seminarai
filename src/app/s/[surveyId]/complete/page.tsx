import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { CheckCircle, XCircle } from "lucide-react";
import { getDbFromContext } from "@/lib/db";
import { getSurveyById, getSurveyResponseById, incrementSurveyResponseCount, updateSurveyResponse } from "@/lib/db/queries/surveys";
import { upsertCustomerByEmail } from "@/lib/db/queries/customers";
import { surveys, events, eventRegistrations, workshopContents, contentAccessTokens } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

function replaceEmailPlaceholders(
  template: string,
  context: { name: string; email: string; event?: { title: string; startDate?: string | null; location?: string | null; onlineUrl?: string | null }; contentUrl?: string }
): string {
  return template
    .replace(/\{\{name\}\}/g, context.name || '')
    .replace(/\{\{email\}\}/g, context.email || '')
    .replace(/\{\{event_title\}\}/g, context.event?.title || '')
    .replace(/\{\{event_date\}\}/g, context.event?.startDate || '')
    .replace(/\{\{event_location\}\}/g, context.event?.location || '')
    .replace(/\{\{online_url\}\}/g, context.event?.onlineUrl || '')
    .replace(/\{\{content_url\}\}/g, context.contentUrl || '');
}

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
      const survey = await getSurveyById(db, surveyId);
      const response = await getSurveyResponseById(db, response_id);

      if (survey) {
        thankYouMessage = survey.thankYouMessage || thankYouMessage;
        await incrementSurveyResponseCount(db, surveyId);
      }

      if (survey && response) {
        const respondentEmail = response.respondentEmail || '';
        const respondentName = response.respondentName || '';

        // 顧客レコードを upsert
        let customerId: string | undefined;
        if (respondentEmail) {
          const customer = await upsertCustomerByEmail(db, survey.organizationId, {
            email: respondentEmail,
            fullName: respondentName || undefined,
            source: 'survey',
            sourceEventId: survey.eventId || undefined,
          });
          customerId = customer.id;
        }

        // paymentStatus を paid に更新 & customerId を紐付け
        await updateSurveyResponse(db, response_id, {
          paymentStatus: 'paid',
          ...(customerId ? { customerId } : {}),
        });

        // コンテンツアクセストークン生成
        let contentUrl = '';
        if (survey.eventId) {
          try {
            const hasContents = await db.query.workshopContents.findFirst({
              where: eq(workshopContents.eventId, survey.eventId),
              columns: { id: true },
            });
            if (hasContents) {
              const token = crypto.randomUUID();
              await db.insert(contentAccessTokens).values({
                eventId: survey.eventId,
                surveyResponseId: response.id,
                customerId: customerId || null,
                token,
              });
              contentUrl = `https://seminar-crm.foritemaqua.workers.dev/contents/${token}`;
            }
          } catch {
            // トークン生成失敗は表示に影響させない
          }
        }

        // thankYouMessage に {{content_url}} を置換
        thankYouMessage = thankYouMessage
          .replace(/\{\{content_url\}\}/g, contentUrl);

        // 完了メール送信
        if (survey.completionEmailEnabled && survey.completionEmailBody && respondentEmail) {
          try {
            let eventData: { title: string; startDate?: string | null; location?: string | null; onlineUrl?: string | null } | undefined;
            if (survey.eventId) {
              const event = await db.query.events.findFirst({
                where: eq(events.id, survey.eventId),
                columns: { title: true, startDate: true, location: true, onlineUrl: true },
              });
              if (event) eventData = event;
            }
            const subject = replaceEmailPlaceholders(
              survey.completionEmailSubject || 'ご回答ありがとうございます',
              { name: respondentName, email: respondentEmail, event: eventData, contentUrl }
            );
            const body = replaceEmailPlaceholders(
              survey.completionEmailBody,
              { name: respondentName, email: respondentEmail, event: eventData, contentUrl }
            );
            await sendEmail(respondentEmail, subject, body, 'text');
          } catch {
            // メール送信失敗は表示に影響させない
          }
        }

        // category=registration かつ eventId がある場合、参加者登録
        if (
          survey.category === 'registration' &&
          survey.eventId &&
          respondentEmail &&
          customerId
        ) {
          const eventId = survey.eventId;
          const existingReg = await db.query.eventRegistrations.findFirst({
            where: (r, { and, eq: colEq }) =>
              and(colEq(r.eventId, eventId), colEq(r.email, respondentEmail)),
            columns: { id: true },
          });

          if (!existingReg) {
            await db.insert(eventRegistrations).values({
              eventId,
              customerId,
              organizationId: survey.organizationId,
              email: respondentEmail,
              fullName: respondentName || undefined,
              status: 'registered',
            });
            await db
              .update(events)
              .set({
                registrationCount: sql`coalesce(${events.registrationCount}, 0) + 1`,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(events.id, eventId));
          }
        }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-3 whitespace-pre-wrap">{thankYouMessage}</h2>
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
