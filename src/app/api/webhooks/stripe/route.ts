import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDbFromContext } from "@/lib/db";
import {
  getOrganizationByStripeCustomerId,
} from "@/lib/db/queries/organizations";
import { upsertSubscription, cancelSubscription, createBillingRecord } from "@/lib/db/queries/billing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10" as any,
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const db = getDbFromContext();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const org = await getOrganizationByStripeCustomerId(db, subscription.customer as string);

        if (org) {
          await upsertSubscription(db, {
            organizationId: org.id,
            planId: org.planId!,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await cancelSubscription(db, subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        const org = await getOrganizationByStripeCustomerId(db, invoice.customer as string);

        if (org) {
          await createBillingRecord(db, {
            organizationId: org.id,
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId: invoice.payment_intent as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            description: invoice.description || "サブスクリプション",
            invoiceUrl: invoice.hosted_invoice_url ?? undefined,
            invoicePdf: invoice.invoice_pdf ?? undefined,
            paidAt: new Date().toISOString(),
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
