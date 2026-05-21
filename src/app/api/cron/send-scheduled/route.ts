import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { emailCampaigns } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendCampaignEmails } from "@/lib/email/send-campaign";
import { nowUtc } from "@/lib/datetime";

export async function GET(request: NextRequest) {
  // 認証: CRON_SECRET で照合
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDbFromContext();
  const now = nowUtc();

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

    const baseUrl = new URL(request.url).origin;

    const results: {
      id: string;
      title: string;
      status: string;
      sentCount: number;
      totalRecipients: number;
    }[] = [];

    for (const campaign of scheduledCampaigns) {
      try {
        const result = await sendCampaignEmails(db, campaign.id, baseUrl);
        results.push({
          id: campaign.id,
          title: campaign.title,
          status: result.status === "partial" ? "scheduled" : "sent",
          sentCount: result.sentCount,
          totalRecipients: result.totalRecipients,
        });
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
