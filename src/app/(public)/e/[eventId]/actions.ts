"use server";

import { getDbFromContext } from "@/lib/db";
import { getPublicEvent, upsertEventRegistration } from "@/lib/db/queries/events";
import { getOrganizationById } from "@/lib/db/queries/organizations";
import { createSurveyResponse, incrementSurveyResponseCount } from "@/lib/db/queries/surveys";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { customers, events, eventRegistrations, surveys } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";
import { getValidAccessToken, getFreeBusy } from "@/lib/google-calendar";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function registerForEventAction(
  eventId: string,
  formData: {
    email: string;
    fullName: string;
    surveyId?: string;
    organizationId: string;
    answers?: Record<string, unknown>;
    notificationConsent?: number;
    requestedDate?: string;
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
      notificationConsent: formData.notificationConsent ?? 0,
      requestedDate: formData.requestedDate,
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

/**
 * 公開ページ用: イベントのorganizationIdからGoogleカレンダーの空き日程を取得（認証不要）
 */
export async function getPublicAvailableDatesAction(eventId: string): Promise<{
  dates?: { date: string; status: 'both_free' | 'one_free' | 'both_busy' }[];
  error?: string;
}> {
  const db = getDbFromContext();

  // イベント情報を取得
  const event = await getPublicEvent(db, eventId);
  if (!event) {
    return { error: 'イベントが見つかりません' };
  }

  // 組織情報を取得
  const org = await getOrganizationById(db, event.organizationId);
  if (!org) {
    return { error: '組織情報が取得できません' };
  }

  const orgSettings = (org.settings || {}) as Record<string, unknown>;
  const secondaryCalendarId = orgSettings.secondaryCalendarId as string | undefined;

  // イベント作成者のGoogleトークンを使用
  const userId = event.createdBy;
  if (!userId) {
    return { error: 'カレンダー情報を取得できません' };
  }

  const { env } = getCloudflareContext();
  const accessToken = await getValidAccessToken(
    db,
    userId,
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
  );

  if (!accessToken) {
    return { error: 'カレンダー情報を取得できません' };
  }

  // カレンダーID一覧（プライマリ + セカンダリ）
  const calendarIds = ['primary'];
  if (secondaryCalendarId) {
    calendarIds.push(secondaryCalendarId);
  }

  // 今日から1ヶ月先まで
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timeMax = new Date(timeMin);
  timeMax.setMonth(timeMax.getMonth() + 1);

  try {
    const freeBusy = await getFreeBusy(
      accessToken,
      calendarIds,
      timeMin.toISOString(),
      timeMax.toISOString(),
    );

    // 日付ごとの空き状況を計算
    const dates: { date: string; status: 'both_free' | 'one_free' | 'both_busy' }[] = [];
    const current = new Date(timeMin);

    while (current < timeMax) {
      const dateStr = current.toISOString().split('T')[0];
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setDate(dayEnd.getDate() + 1);

      let primaryBusy = false;
      let secondaryBusy = false;

      // プライマリカレンダーの予定チェック
      const primaryCalendar = freeBusy.calendars['primary'];
      if (primaryCalendar?.busy) {
        primaryBusy = primaryCalendar.busy.some((slot) => {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          return slotStart < dayEnd && slotEnd > dayStart;
        });
      }

      // セカンダリカレンダーの予定チェック
      if (secondaryCalendarId) {
        const secondaryCalendar = freeBusy.calendars[secondaryCalendarId];
        if (secondaryCalendar?.busy) {
          secondaryBusy = secondaryCalendar.busy.some((slot) => {
            const slotStart = new Date(slot.start);
            const slotEnd = new Date(slot.end);
            return slotStart < dayEnd && slotEnd > dayStart;
          });
        }
      }

      let status: 'both_free' | 'one_free' | 'both_busy';
      if (!primaryBusy && !secondaryBusy) {
        status = 'both_free';
      } else if (primaryBusy && secondaryBusy) {
        status = 'both_busy';
      } else {
        status = secondaryCalendarId ? 'one_free' : (primaryBusy ? 'both_busy' : 'both_free');
      }

      dates.push({ date: dateStr, status });
      current.setDate(current.getDate() + 1);
    }

    return { dates };
  } catch (err) {
    console.error('FreeBusy API error:', err);
    return { error: 'カレンダーの空き情報の取得に失敗しました' };
  }
}
