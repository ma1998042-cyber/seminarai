"use server";

import { getDbFromContext } from "@/lib/db";
import { getPublicEvent, upsertEventRegistration } from "@/lib/db/queries/events";
import { createSurveyResponse, incrementSurveyResponseCount } from "@/lib/db/queries/surveys";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { customers, events, eventRegistrations, surveys } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

export async function registerForEventAction(
  eventId: string,
  formData: {
    email: string;
    fullName: string;
    surveyId?: string;
    organizationId: string;
    answers?: Record<string, unknown>;
  }
): Promise<{ error?: string }> {
  const db = getDbFromContext();

  try {
    // 1. イベントを取得して検証
    const event = await getPublicEvent(db, eventId);
    if (!event) {
      return { error: "このイベントは現在受付していません" };
    }

    // 定員チェック
    if (event.capacity != null && event.registrationCount >= event.capacity) {
      return { error: "定員に達したため、申し込みを受け付けられません" };
    }

    // 2. 既存の申し込みを確認
    const existingRegistration = await db.query.eventRegistrations.findFirst({
      where: and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.email, formData.email),
      ),
    });

    if (existingRegistration) {
      return { error: "このメールアドレスは既に申し込み済みです" };
    }

    // 3. customersテーブルにupsert
    const [customer] = await db
      .insert(customers)
      .values({
        organizationId: event.organizationId,
        email: formData.email,
        fullName: formData.fullName,
        source: "event",
        sourceEventId: eventId,
      })
      .onConflictDoUpdate({
        target: [customers.organizationId, customers.email],
        set: {
          fullName: formData.fullName,
          lastActivityAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    // 4. event_registrationsテーブルにinsert
    await upsertEventRegistration(db, {
      eventId,
      customerId: customer.id,
      organizationId: event.organizationId,
      email: formData.email,
      fullName: formData.fullName,
    });

    // 5. registrationCount をインクリメント
    await db
      .update(events)
      .set({
        registrationCount: sql`coalesce(${events.registrationCount}, 0) + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(events.id, eventId));

    // 6. アンケート回答を保存（surveyIdがある場合）
    if (formData.surveyId && formData.answers) {
      await createSurveyResponse(db, {
        surveyId: formData.surveyId,
        organizationId: formData.organizationId,
        customerId: customer.id,
        respondentName: formData.fullName,
        respondentEmail: formData.email,
        answers: formData.answers,
      });
      await incrementSurveyResponseCount(db, formData.surveyId);

      // 7. 完了メール送信（設定されている場合）
      try {
        const survey = await db.query.surveys.findFirst({
          where: eq(surveys.id, formData.surveyId),
        });
        if (survey?.completionEmailBody) {
          const subject = replaceEmailPlaceholders(
            survey.completionEmailSubject || "ご回答ありがとうございます",
            { name: formData.fullName, email: formData.email, event }
          );
          const body = replaceEmailPlaceholders(
            survey.completionEmailBody,
            { name: formData.fullName, email: formData.email, event }
          );
          await sendEmail(formData.email, subject, body, "text");
        }
      } catch {
        // メール送信失敗は回答登録に影響させない
      }
    }

    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);

    return {};
  } catch {
    return { error: "送信に失敗しました。もう一度お試しください" };
  }
}

function replaceEmailPlaceholders(
  template: string,
  context: { name: string; email: string; event: { title: string; startDate?: string | null; location?: string | null; onlineUrl?: string | null } }
): string {
  return template
    .replace(/\{\{name\}\}/g, context.name || "")
    .replace(/\{\{email\}\}/g, context.email || "")
    .replace(/\{\{event_title\}\}/g, context.event.title || "")
    .replace(/\{\{event_date\}\}/g, context.event.startDate ? formatDateTime(context.event.startDate) : "")
    .replace(/\{\{event_location\}\}/g, context.event.location || "")
    .replace(/\{\{event_url\}\}/g, "")
    .replace(/\{\{online_url\}\}/g, context.event.onlineUrl || "");
}
