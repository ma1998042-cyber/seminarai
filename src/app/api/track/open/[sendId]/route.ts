import { NextRequest } from "next/server";
import { getDbFromContext } from "@/lib/db";
import { emailSends, emailCampaigns } from "@/lib/db/schema";
import { eq, sql, isNull, and } from "drizzle-orm";

// 1x1 透過GIF (最小バイナリ)
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sendId: string }> },
) {
  const { sendId } = await params;

  try {
    const db = getDbFromContext();
    const now = new Date().toISOString();

    // email_sends の openedAt を初回のみ更新（NULL → 現在時刻）
    const updated = await db
      .update(emailSends)
      .set({ openedAt: now })
      .where(and(eq(emailSends.id, sendId), isNull(emailSends.openedAt)));

    // email_campaigns の openCount を +1（該当行があれば）
    // まず送信レコードから campaignId を取得
    const sendRecord = await db
      .select({ campaignId: emailSends.campaignId })
      .from(emailSends)
      .where(eq(emailSends.id, sendId))
      .limit(1);

    if (sendRecord.length > 0) {
      await db
        .update(emailCampaigns)
        .set({ openCount: sql`${emailCampaigns.openCount} + 1` })
        .where(eq(emailCampaigns.id, sendRecord[0].campaignId))
        .catch(() => {
          // 該当行がなければ no-op
        });
    }
  } catch (e) {
    // トラッキングエラーでもピクセルは返す
    console.error("Track open error:", e);
  }

  return new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
