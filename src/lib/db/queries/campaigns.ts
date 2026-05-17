import { eq, and, inArray, count, sql, gte } from "drizzle-orm";
import { emailCampaigns, emailSends } from "../schema";
import type { Database } from "..";

export async function getCampaigns(
  db: Database,
  orgId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  },
) {
  const conditions = [eq(emailCampaigns.organizationId, orgId)];
  if (options?.status) {
    conditions.push(eq(emailCampaigns.status, options.status));
  }

  return db.query.emailCampaigns.findMany({
    where: and(...conditions),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    limit: options?.limit,
    offset: options?.offset,
  });
}

export async function countCampaigns(
  db: Database,
  orgId: string,
  options?: { status?: string },
) {
  const conditions = [eq(emailCampaigns.organizationId, orgId)];
  if (options?.status) {
    conditions.push(eq(emailCampaigns.status, options.status));
  }

  const [result] = await db
    .select({ count: count() })
    .from(emailCampaigns)
    .where(and(...conditions));
  return result?.count ?? 0;
}

export async function getCampaignById(db: Database, orgId: string, id: string) {
  return db.query.emailCampaigns.findFirst({
    where: and(
      eq(emailCampaigns.id, id),
      eq(emailCampaigns.organizationId, orgId),
    ),
  });
}

export async function createCampaign(
  db: Database,
  data: {
    organizationId: string;
    title: string;
    subject: string;
    previewText?: string;
    bodyHtml: string;
    bodyText?: string;
    format?: string;
    status?: string;
    targetType?: string;
    targetTagIds?: string[] | null;
    targetSurveyId?: string | null;
    targetCustomerIds?: string[] | null;
    scheduledAt?: string;
    settings?: Record<string, unknown>;
    createdBy?: string;
  },
) {
  const [campaign] = await db.insert(emailCampaigns).values(data).returning();
  return campaign;
}

export async function updateCampaign(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<{
    title: string;
    subject: string;
    previewText: string | null;
    bodyHtml: string;
    bodyText: string | null;
    format: string;
    status: string;
    targetType: string;
    targetTagIds: string[] | null;
    targetSurveyId: string | null;
    targetCustomerIds: string[] | null;
    scheduledAt: string | null;
    sentAt: string | null;
    totalRecipients: number;
    sentCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    unsubscribeCount: number;
    settings: Record<string, unknown>;
  }>,
) {
  const [campaign] = await db
    .update(emailCampaigns)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.organizationId, orgId)))
    .returning();
  return campaign;
}

export async function deleteCampaign(
  db: Database,
  orgId: string,
  id: string,
  allowedStatuses: string[] = ["draft", "canceled"],
) {
  const [deleted] = await db
    .delete(emailCampaigns)
    .where(
      and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.organizationId, orgId),
        inArray(emailCampaigns.status, allowedStatuses),
      ),
    )
    .returning();
  return deleted;
}

/**
 * 直近7日間の日別メール開封率・クリック率を取得
 */
export async function getDailyEmailTrackingStats(
  db: Database,
  orgId: string,
  days: number = 7,
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - (days - 1));
  const sinceDateStr = sinceDate.toISOString().slice(0, 10);

  const rows = await db
    .select({
      date: sql<string>`date(${emailSends.sentAt})`.as("send_date"),
      total: count().as("total"),
      opened: sql<number>`sum(case when ${emailSends.openedAt} is not null then 1 else 0 end)`.as("opened"),
      clicked: sql<number>`sum(case when ${emailSends.clickedAt} is not null then 1 else 0 end)`.as("clicked"),
    })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.organizationId, orgId),
        gte(sql`date(${emailSends.sentAt})`, sinceDateStr),
      ),
    )
    .groupBy(sql`date(${emailSends.sentAt})`)
    .orderBy(sql`date(${emailSends.sentAt})`);

  // 日付マップを作成（データがない日は0%にする）
  const dataMap = new Map<string, { openRate: number; clickRate: number }>();
  for (const row of rows) {
    if (row.date) {
      const total = Number(row.total) || 0;
      const opened = Number(row.opened) || 0;
      const clicked = Number(row.clicked) || 0;
      dataMap.set(row.date, {
        openRate: total > 0 ? Math.round((opened / total) * 1000) / 10 : 0,
        clickRate: total > 0 ? Math.round((clicked / total) * 1000) / 10 : 0,
      });
    }
  }

  // 直近N日分のデータを生成
  const result: { date: string; label: string; openRate: number; clickRate: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const stats = dataMap.get(dateStr) || { openRate: 0, clickRate: 0 };
    result.push({ date: dateStr, label, ...stats });
  }

  return result;
}
