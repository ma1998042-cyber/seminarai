import { eq, and, inArray, count } from "drizzle-orm";
import { emailCampaigns } from "../schema";
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
