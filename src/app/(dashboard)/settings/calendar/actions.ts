"use server";

import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { account } from "@/lib/db/auth-schema";
import { getUserProfile } from "@/lib/db/queries/users";
import { getOrganizationById, updateOrganization } from "@/lib/db/queries/organizations";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Googleカレンダー連携状態を取得する
 */
export async function getCalendarConnectionStatus() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  if (!profile?.currentOrganizationId) return { error: "組織が見つかりません" };

  const org = await getOrganizationById(db, profile.currentOrganizationId);
  if (!org) return { error: "組織が見つかりません" };

  // Googleアカウント連携状態を確認
  const googleAccount = await db
    .select({
      id: account.id,
      accountId: account.accountId,
      scope: account.scope,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
    })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "google")))
    .get();

  const settings = (org.settings || {}) as Record<string, unknown>;

  return {
    connected: !!googleAccount?.accessToken,
    googleAccountId: googleAccount?.accountId || null,
    hasRefreshToken: !!googleAccount?.refreshToken,
    secondaryCalendarId: (settings.secondaryCalendarId as string) || "",
    orgId: org.id,
  };
}

/**
 * セカンダリカレンダーIDを保存する
 */
export async function saveSecondaryCalendarId(calendarId: string) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  if (!profile?.currentOrganizationId) return { error: "組織が見つかりません" };

  const org = await getOrganizationById(db, profile.currentOrganizationId);
  if (!org) return { error: "組織が見つかりません" };

  const currentSettings = (org.settings || {}) as Record<string, unknown>;
  const newSettings = {
    ...currentSettings,
    secondaryCalendarId: calendarId.trim() || null,
  };

  try {
    await updateOrganization(db, org.id, { settings: newSettings });
    revalidatePath("/settings/calendar");
    return { success: true };
  } catch {
    return { error: "保存に失敗しました" };
  }
}

/**
 * Google連携を解除する（accountテーブルからGoogleアカウントレコードを削除）
 */
export async function disconnectGoogle() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();

  try {
    await db
      .delete(account)
      .where(
        and(eq(account.userId, user.id), eq(account.providerId, "google")),
      );
    revalidatePath("/settings/calendar");
    return { success: true };
  } catch {
    return { error: "連携解除に失敗しました" };
  }
}
