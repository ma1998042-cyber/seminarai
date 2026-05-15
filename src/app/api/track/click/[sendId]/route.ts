import { NextRequest, NextResponse } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { emailSends, emailCampaigns } from "@/lib/db/schema";
import { eq, sql, isNull, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sendId: string }> },
) {
  const { sendId } = await params;
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const db = getDbFromContext();
    const now = new Date().toISOString();

    // email_sends の clickedAt を初回のみ更新（NULL → 現在時刻）
    await db
      .update(emailSends)
      .set({ clickedAt: now })
      .where(and(eq(emailSends.id, sendId), isNull(emailSends.clickedAt)));

    // email_campaigns の clickCount を +1（該当行があれば）
    const sendRecord = await db
      .select({ campaignId: emailSends.campaignId })
      .from(emailSends)
      .where(eq(emailSends.id, sendId))
      .limit(1);

    if (sendRecord.length > 0) {
      await db
        .update(emailCampaigns)
        .set({ clickCount: sql`${emailCampaigns.clickCount} + 1` })
        .where(eq(emailCampaigns.id, sendRecord[0].campaignId))
        .catch(() => {
          // 該当行がなければ no-op
        });
    }
  } catch (e) {
    console.error("Track click error:", e);
  }

  // 302 リダイレクトで元URLに飛ばす
  return NextResponse.redirect(url, 302);
}
