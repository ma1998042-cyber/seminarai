"use server";

import { getDbFromContext } from "@/lib/db";
import { getPublicEvent, upsertEventRegistration } from "@/lib/db/queries/events";
import { eq, and, sql } from "drizzle-orm";
import { customers, events, eventRegistrations } from "@/lib/db/schema";

export async function registerForEventAction(
  eventId: string,
  formData: { email: string; fullName: string }
): Promise<{ error?: string }> {
  const db = getDbFromContext();

  try {
    // 1. イベントを取得して検証
    const event = await getPublicEvent(db, eventId);
    if (!event) {
      return { error: "このイベントは現在受付していません" };
    }

    // 定員チェック
    if (event.capacity != null && event.registrationCount >= event.capacity) {
      return { error: "定員に達したため、申し込みを受け付けられません" };
    }

    // 2. 既存の申し込みを確認
    const existingRegistration = await db.query.eventRegistrations.findFirst({
      where: and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.email, formData.email),
      ),
    });

    if (existingRegistration) {
      return { error: "このメールアドレスは既に申し込み済みです" };
    }

    // 3. customersテーブルにupsert
    const [customer] = await db
      .insert(customers)
      .values({
        organizationId: event.organizationId,
        email: formData.email,
        fullName: formData.fullName,
        source: "event",
        sourceEventId: eventId,
      })
      .onConflictDoUpdate({
        target: [customers.organizationId, customers.email],
        set: {
          fullName: formData.fullName,
          lastActivityAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    // 4. event_registrationsテーブルにinsert
    await upsertEventRegistration(db, {
      eventId,
      customerId: customer.id,
      organizationId: event.organizationId,
      email: formData.email,
      fullName: formData.fullName,
    });

    // 5. registrationCount をインクリメント
    await db
      .update(events)
      .set({
        registrationCount: sql`${events.registrationCount} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(events.id, eventId));

    return {};
  } catch {
    return { error: "送信に失敗しました。もう一度お試しください" };
  }
}
