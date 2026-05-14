import { eq } from "drizzle-orm";
import { subscriptions, billingHistory } from "../schema";
import type { Database } from "..";

export async function getSubscription(db: Database, orgId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
    with: { plan: true },
  });
}

export async function upsertSubscription(
  db: Database,
  data: {
    organizationId: string;
    planId: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    status?: string;
    billingCycle?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string;
  },
) {
  const [sub] = await db
    .insert(subscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        planId: data.planId,
        ...(data.stripePriceId !== undefined && { stripePriceId: data.stripePriceId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.billingCycle !== undefined && { billingCycle: data.billingCycle }),
        ...(data.currentPeriodStart !== undefined && { currentPeriodStart: data.currentPeriodStart }),
        ...(data.currentPeriodEnd !== undefined && { currentPeriodEnd: data.currentPeriodEnd }),
        ...(data.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: data.cancelAtPeriodEnd }),
        ...(data.canceledAt !== undefined && { canceledAt: data.canceledAt }),
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();
  return sub;
}

export async function getBillingHistory(db: Database, orgId: string) {
  return db.query.billingHistory.findMany({
    where: eq(billingHistory.organizationId, orgId),
    orderBy: (b, { desc }) => [desc(b.createdAt)],
  });
}

export async function createBillingRecord(
  db: Database,
  data: {
    organizationId: string;
    stripeInvoiceId?: string;
    stripePaymentIntentId?: string;
    amount: number;
    currency?: string;
    status: string;
    description?: string;
    invoiceUrl?: string;
    invoicePdf?: string;
    periodStart?: string;
    periodEnd?: string;
    paidAt?: string;
  },
) {
  const [record] = await db.insert(billingHistory).values(data).returning();
  return record;
}
