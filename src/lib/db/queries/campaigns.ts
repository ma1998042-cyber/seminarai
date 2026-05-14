import { eq, and } from "drizzle-orm";
import { emailCampaigns } from "../schema";
import type { Database } from "..";

export async function getCampaigns(db: Database, orgId: string) {
  return db.query.emailCampaigns.findMany({
    where: eq(emailCampaigns.organizationId, orgId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
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
