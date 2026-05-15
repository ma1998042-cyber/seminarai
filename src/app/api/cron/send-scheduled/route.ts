import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import {
  emailCampaigns,
  emailSends,
  customers,
  customerTags,
  surveyResponses,
} from "@/lib/db/schema";
import { eq, and, inArray, lte, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { addTrackingPixel, rewriteLinks } from "@/lib/email/tracking";

export async function GET(request: NextRequest) {
  // 認証: CRON_SECRET で照合
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDbFromContext();
  const now = new Date().toISOString();

  try {
    // status='scheduled' かつ scheduledAt <= now のキャンペーンを取得
    const scheduledCampaigns = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.status, "scheduled"),
          lte(emailCampaigns.scheduledAt, now),
        ),
      );

    const results: {
      id: string;
      title: string;
      status: string;
      sentCount: number;
      totalRecipients: number;
    }[] = [];

    for (const campaign of scheduledCampaigns) {
      try {
        // ターゲット解決
        const recipients = await resolveTargetEmails(
          db,
          campaign.organizationId,
          campaign.targetType,
          campaign.targetTagIds ?? [],
          campaign.targetSurveyId ?? undefined,
        );

        if (recipients.length === 0) {
          // 対象なし → sent にして完了
          await db
            .update(emailCampaigns)
            .set({
              status: "sent",
              sentAt: now,
              totalRecipients: 0,
              sentCount: 0,
              updatedAt: now,
            })
            .where(eq(emailCampaigns.id, campaign.id));

          results.push({
            id: campaign.id,
            title: campaign.title,
            status: "sent",
            sentCount: 0,
            totalRecipients: 0,
          });
          continue;
        }

        // 既に送信済みの顧客をスキップ
        const alreadySent = await db
          .select({ email: emailSends.email })
          .from(emailSends)
          .where(
            and(
              eq(emailSends.campaignId, campaign.id),
              inArray(emailSends.status, ["sent"]),
            ),
          );
        const alreadySentEmails = new Set(alreadySent.map((r) => r.email));

        const pendingRecipients = recipients.filter(
          (r) => !alreadySentEmails.has(r.email),
        );

        let sentCount = 0;
        let failedCount = 0;

        const baseUrl = new URL(request.url).origin;

        for (const recipient of pendingRecipients) {
          try {
            // 先に pending で insert して id を取得
            const sendRecord = await db
              .insert(emailSends)
              .values({
                campaignId: campaign.id,
                organizationId: campaign.organizationId,
                customerId: recipient.customerId,
                email: recipient.email,
                status: "pending",
              })
              .returning({ id: emailSends.id });

            const sendId = sendRecord[0].id;

            // トラッキング付きHTMLを生成
            let trackedHtml = addTrackingPixel(
              campaign.bodyHtml,
              sendId,
              baseUrl,
            );
            trackedHtml = rewriteLinks(trackedHtml, sendId, baseUrl);

            await sendEmail(recipient.email, campaign.subject, trackedHtml);

            // 成功 → sent に更新
            await db
              .update(emailSends)
              .set({ status: "sent", sentAt: new Date().toISOString() })
              .where(eq(emailSends.id, sendId));
            sentCount++;
          } catch (err) {
            // pending レコードが既にあれば failed に更新、なければ insert
            // (insert 自体が失敗した場合のフォールバック)
            try {
              await db.insert(emailSends).values({
                campaignId: campaign.id,
                organizationId: campaign.organizationId,
                customerId: recipient.customerId,
                email: recipient.email,
                status: "failed",
                errorMessage:
                  err instanceof Error
                    ? err.message
                    : "メール送信に失敗しました",
              });
            } catch {
              // pending レコードが既に存在する場合
            }
            failedCount++;
          }
        }

        // 部分失敗時は scheduled のまま（次回cronで再試行）
        if (failedCount > 0 && sentCount < pendingRecipients.length) {
          await db
            .update(emailCampaigns)
            .set({
              totalRecipients: recipients.length,
              sentCount: sentCount + alreadySentEmails.size,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(emailCampaigns.id, campaign.id));

          results.push({
            id: campaign.id,
            title: campaign.title,
            status: "scheduled",
            sentCount: sentCount + alreadySentEmails.size,
            totalRecipients: recipients.length,
          });
        } else {
          // 全送信完了
          await db
            .update(emailCampaigns)
            .set({
              status: "sent",
              sentAt: new Date().toISOString(),
              totalRecipients: recipients.length,
              sentCount: sentCount + alreadySentEmails.size,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(emailCampaigns.id, campaign.id));

          results.push({
            id: campaign.id,
            title: campaign.title,
            status: "sent",
            sentCount: sentCount + alreadySentEmails.size,
            totalRecipients: recipients.length,
          });
        }
      } catch (error) {
        console.error(
          `Campaign ${campaign.id} processing error:`,
          error,
        );
        results.push({
          id: campaign.id,
          title: campaign.title,
          status: "error",
          sentCount: 0,
          totalRecipients: 0,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: scheduledCampaigns.length,
      campaigns: results,
    });
  } catch (error) {
    console.error("Cron send-scheduled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * ターゲット解決: campaigns/[id]/actions.ts の resolveTargetEmails と同等ロジック
 * emailOptIn=true の顧客のみ対象
 */
async function resolveTargetEmails(
  db: any,
  orgId: string,
  targetType: string,
  tagIds: string[],
  surveyId?: string,
): Promise<{ email: string; customerId: string | null }[]> {
  if (targetType === "survey_respondents" && surveyId) {
    const responses = await db
      .select({
        email: surveyResponses.respondentEmail,
        name: surveyResponses.respondentName,
      })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId));

    const uniqueEmails = [
      ...new Set(
        responses
          .filter((r: any) => r.email)
          .map((r: any) => r.email!),
      ),
    ] as string[];
    if (uniqueEmails.length === 0) return [];

    // 顧客テーブルとマッチング（emailOptIn=true のみ）
    const existingCustomers = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, uniqueEmails),
        eq(customers.emailOptIn, true),
      ),
      columns: { id: true, email: true },
    });

    const customerMap = new Map(
      existingCustomers.map((c: any) => [c.email, c.id]),
    );

    // 顧客テーブルにない回答者も含める（optOutチェック不可なので送信対象とする）
    // 顧客テーブルにいてoptOut の人は除外
    const optOutCustomers = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, uniqueEmails),
        eq(customers.emailOptIn, false),
      ),
      columns: { email: true },
    });
    const optOutEmails = new Set(optOutCustomers.map((c: any) => c.email));

    return uniqueEmails
      .filter((email) => !optOutEmails.has(email))
      .map((email) => ({
        email,
        customerId: (customerMap.get(email) as string) ?? null,
      }));
  }

  if (targetType === "tag" && tagIds.length > 0) {
    const taggedCustomerRows = await db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(inArray(customerTags.tagId, tagIds));

    const customerIds = [
      ...new Set(taggedCustomerRows.map((r: any) => r.customerId)),
    ] as string[];
    if (customerIds.length === 0) return [];

    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.id, customerIds),
        eq(customers.emailOptIn, true),
      ),
      columns: { id: true, email: true },
    });

    return results.map((c: any) => ({ email: c.email, customerId: c.id }));
  }

  // 全顧客（emailOptIn=true のみ）
  const allCustomers = await db.query.customers.findMany({
    where: and(
      eq(customers.organizationId, orgId),
      eq(customers.emailOptIn, true),
    ),
    columns: { id: true, email: true },
  });

  return allCustomers.map((c: any) => ({
    email: c.email,
    customerId: c.id,
  }));
}
