import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { events, eventRegistrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

/**
 * プレースホルダを実際の値に置換する
 */
function replacePlaceholders(
  template: string,
  vars: {
    recipientName: string;
    eventTitle: string;
    formattedDate: string;
    locationText: string;
    matchedDay: number;
  },
): string {
  return template
    .replace(/\{\{参加者名\}\}/g, vars.recipientName)
    .replace(/\{\{イベント名\}\}/g, vars.eventTitle)
    .replace(/\{\{開催日時\}\}/g, vars.formattedDate)
    .replace(/\{\{場所\}\}/g, vars.locationText)
    .replace(/\{\{残り日数\}\}/g, String(vars.matchedDay));
}

/**
 * プレーンテキストをHTMLメール本文にラップする
 */
function wrapTextInHtml(text: string): string {
  const htmlBody = text.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${htmlBody}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">このメールはイベント管理システムから自動送信されています。</p>
</body>
</html>`;
}

/**
 * イベントリマインドメール送信 cron エンドポイント
 * 毎日1回実行し、reminderEnabled=1 のイベントで
 * startDate が reminderDays で指定された日数後のものを検索して
 * 参加者にリマインドメールを送信する
 */
export async function GET(request: NextRequest) {
  // 認証: CRON_SECRET で照合
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDbFromContext();

  try {
    // reminderEnabled=1 のイベントを取得
    const reminderEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.reminderEnabled, 1),
          eq(events.status, "active"),
        ),
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results: {
      eventId: string;
      eventTitle: string;
      reminderDay: number;
      sentCount: number;
      errorCount: number;
    }[] = [];

    for (const event of reminderEvents) {
      if (!event.startDate) continue;

      // reminderDays を解析
      let reminderDays: number[];
      try {
        reminderDays = JSON.parse(event.reminderDays);
      } catch {
        continue;
      }

      // startDate をパース（YYYY-MM-DD or YYYY-MM-DDTHH:mm 形式想定）
      const startDate = new Date(event.startDate);
      startDate.setHours(0, 0, 0, 0);

      // 今日がリマインド送信日かチェック
      const diffMs = startDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) continue; // 過去のイベントはスキップ

      const matchedDay = reminderDays.find((d) => d === diffDays);
      if (matchedDay === undefined) continue;

      // 参加者を取得
      const registrations = await db
        .select()
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, event.id));

      let sentCount = 0;
      let errorCount = 0;

      for (const reg of registrations) {
        if (!reg.email) continue;

        const locationText = event.isOnline
          ? (event.onlineUrl ? `オンライン（${event.onlineUrl}）` : "オンライン")
          : (event.location || "未定");

        const formattedDate = event.startDate
          ? new Date(event.startDate).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            })
          : "未定";

        const recipientName = reg.fullName || "参加者";

        const placeholderVars = {
          recipientName,
          eventTitle: event.title,
          formattedDate,
          locationText,
          matchedDay,
        };

        // 件名: カスタムテンプレートがあればプレースホルダ置換、なければデフォルト
        const subject = event.reminderSubject
          ? replacePlaceholders(event.reminderSubject, placeholderVars)
          : `【リマインド】${event.title} 開催まであと${matchedDay}日`;

        // 本文: カスタムテンプレートがあればプレースホルダ置換+HTMLラップ、なければデフォルト
        let htmlContent: string;
        if (event.reminderBody) {
          const replacedBody = replacePlaceholders(event.reminderBody, placeholderVars);
          htmlContent = wrapTextInHtml(replacedBody);
        } else {
          htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4f46e5; margin-bottom: 24px;">イベントリマインド</h2>
  <p>${recipientName} 様</p>
  <p>ご登録いただいたイベントの開催が <strong>${matchedDay}日後</strong> に迫っています。</p>
  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold; width: 120px;">イベント名</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${event.title}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">開催日時</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${formattedDate}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">場所</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${locationText}</td>
    </tr>
  </table>
  <p>ご参加をお待ちしております。</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">このメールはイベント管理システムから自動送信されています。</p>
</body>
</html>`.trim();
        }

        try {
          await sendEmail(
            reg.email,
            subject,
            htmlContent,
            "html",
          );
          sentCount++;
        } catch (error) {
          console.error(`Reminder email failed for ${reg.email}:`, error);
          errorCount++;
        }
      }

      results.push({
        eventId: event.id,
        eventTitle: event.title,
        reminderDay: matchedDay,
        sentCount,
        errorCount,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Cron send-reminders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
