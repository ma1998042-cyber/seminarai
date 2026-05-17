import { eq, and, inArray } from "drizzle-orm";
import {
  emailCampaigns,
  emailSends,
  customers,
  customerTags,
  surveyResponses,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { addTrackingPixel, rewriteLinks } from "@/lib/email/tracking";

type Database = any;

/**
 * メール本文中のプレースホルダーを顧客情報に置換する
 * {{name}} → 顧客名、{{name}}様 → 名前がない場合は「様」ごと除去
 */
export function replacePlaceholders(body: string, name: string | null | undefined): string {
  const resolvedName = name?.trim() || "";

  // {{name}}様 パターン: 名前がない場合は「様」ごと除去
  let result = body.replace(/\{\{name\}\}様/g, resolvedName ? `${resolvedName}様` : "");

  // 残りの {{name}} を置換
  result = result.replace(/\{\{name\}\}/g, resolvedName);

  return result;
}

interface SendCampaignResult {
  status: "sent" | "partial" | "no_recipients" | "error";
  sentCount: number;
  totalRecipients: number;
  error?: string;
}

/**
 * キャンペーンのメール送信を実行する共通関数
 * cron と即時配信の両方から利用される
 */
export async function sendCampaignEmails(
  db: Database,
  campaignId: string,
  baseUrl: string,
): Promise<SendCampaignResult> {
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId));

  if (!campaign) {
    return { status: "error", sentCount: 0, totalRecipients: 0, error: "キャンペーンが見つかりません" };
  }

  // ステータスを sending に更新
  await db
    .update(emailCampaigns)
    .set({ status: "sending", updatedAt: new Date().toISOString() })
    .where(eq(emailCampaigns.id, campaignId));

  // ターゲット解決
  const recipients = await resolveTargetEmails(
    db,
    campaign.organizationId,
    campaign.targetType,
    campaign.targetTagIds ?? [],
    campaign.targetSurveyId ?? undefined,
    campaign.targetCustomerIds ?? undefined,
  );

  if (recipients.length === 0) {
    const now = new Date().toISOString();
    await db
      .update(emailCampaigns)
      .set({ status: "sent", sentAt: now, totalRecipients: 0, sentCount: 0, updatedAt: now })
      .where(eq(emailCampaigns.id, campaignId));
    return { status: "no_recipients", sentCount: 0, totalRecipients: 0 };
  }

  // 既に送信済みの顧客をスキップ
  const alreadySent = await db
    .select({ email: emailSends.email })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.campaignId, campaignId),
        inArray(emailSends.status, ["sent"]),
      ),
    );
  const alreadySentEmails = new Set(alreadySent.map((r: any) => r.email));

  const pendingRecipients = recipients.filter(
    (r) => !alreadySentEmails.has(r.email),
  );

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of pendingRecipients) {
    try {
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

      const campaignFormat = campaign.format === "text" ? "text" : "html";

      // プレースホルダー置換
      const personalizedBody = replacePlaceholders(campaign.bodyHtml, recipient.name);
      const personalizedSubject = replacePlaceholders(campaign.subject, recipient.name);

      if (campaignFormat === "text") {
        // テキスト形式: トラッキングなしでプレーンテキスト送信
        await sendEmail(recipient.email, personalizedSubject, personalizedBody, "text");
      } else {
        // HTML形式: トラッキング付きHTMLを生成
        let trackedHtml = addTrackingPixel(personalizedBody, sendId, baseUrl);
        trackedHtml = rewriteLinks(trackedHtml, sendId, baseUrl);
        await sendEmail(recipient.email, personalizedSubject, trackedHtml, "html");
      }

      await db
        .update(emailSends)
        .set({ status: "sent", sentAt: new Date().toISOString() })
        .where(eq(emailSends.id, sendId));
      sentCount++;
    } catch (err) {
      try {
        await db.insert(emailSends).values({
          campaignId: campaign.id,
          organizationId: campaign.organizationId,
          customerId: recipient.customerId,
          email: recipient.email,
          status: "failed",
          errorMessage:
            err instanceof Error ? err.message : "メール送信に失敗しました",
        });
      } catch {
        // pending レコードが既に存在する場合
      }
      failedCount++;
    }
  }

  const now = new Date().toISOString();
  const totalSent = sentCount + alreadySentEmails.size;

  if (failedCount > 0 && sentCount < pendingRecipients.length) {
    // 部分失敗
    await db
      .update(emailCampaigns)
      .set({
        totalRecipients: recipients.length,
        sentCount: totalSent,
        updatedAt: now,
      })
      .where(eq(emailCampaigns.id, campaignId));
    return { status: "partial", sentCount: totalSent, totalRecipients: recipients.length };
  }

  // 全送信完了
  await db
    .update(emailCampaigns)
    .set({
      status: "sent",
      sentAt: now,
      totalRecipients: recipients.length,
      sentCount: totalSent,
      updatedAt: now,
    })
    .where(eq(emailCampaigns.id, campaignId));

  return { status: "sent", sentCount: totalSent, totalRecipients: recipients.length };
}

/**
 * ターゲット解決: emailOptIn=true の顧客のみ対象
 */
async function resolveTargetEmails(
  db: Database,
  orgId: string,
  targetType: string,
  tagIds: string[],
  surveyId?: string,
  customerIds?: string[],
): Promise<{ email: string; customerId: string | null; name: string | null }[]> {
  if (targetType === "specific_customers" && customerIds && customerIds.length > 0) {
    const results = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.id, customerIds),
        eq(customers.emailOptIn, true),
      ),
      columns: { id: true, email: true, fullName: true },
    });

    return results.map((c: any) => ({ email: c.email, customerId: c.id, name: c.fullName ?? null }));
  }

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
        responses.filter((r: any) => r.email).map((r: any) => r.email!),
      ),
    ] as string[];
    if (uniqueEmails.length === 0) return [];

    const existingCustomers = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, uniqueEmails),
        eq(customers.emailOptIn, true),
      ),
      columns: { id: true, email: true, fullName: true },
    });

    const customerMap = new Map<string, { id: string; name: string | null }>(
      existingCustomers.map((c: any) => [c.email, { id: c.id, name: c.fullName }]),
    );

    const optOutCustomers = await db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, orgId),
        inArray(customers.email, uniqueEmails),
        eq(customers.emailOptIn, false),
      ),
      columns: { email: true },
    });
    const optOutEmails = new Set(optOutCustomers.map((c: any) => c.email));

    // survey_respondents の名前をフォールバックに使う
    const responseNameMap = new Map<string, string>(
      responses.filter((r: any) => r.email && r.name).map((r: any) => [r.email, r.name]),
    );

    return uniqueEmails
      .filter((email) => !optOutEmails.has(email))
      .map((email) => ({
        email,
        customerId: (customerMap.get(email)?.id as string) ?? null,
        name: customerMap.get(email)?.name ?? responseNameMap.get(email) ?? null,
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
      columns: { id: true, email: true, fullName: true },
    });

    return results.map((c: any) => ({ email: c.email, customerId: c.id, name: c.fullName ?? null }));
  }

  // 全顧客（emailOptIn=true のみ）
  const allCustomers = await db.query.customers.findMany({
    where: and(
      eq(customers.organizationId, orgId),
      eq(customers.emailOptIn, true),
    ),
    columns: { id: true, email: true, fullName: true },
  });

  return allCustomers.map((c: any) => ({
    email: c.email,
    customerId: c.id,
    name: c.fullName ?? null,
  }));
}
