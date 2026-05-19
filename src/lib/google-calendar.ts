import { eq, and } from "drizzle-orm";
import { account } from "@/lib/db/auth-schema";
import type { Database } from "@/lib/db";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_FREEBUSY_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/freeBusy";

/**
 * accountテーブルからGoogle OAuthアカウント情報を取得する
 */
export async function getGoogleAccount(db: Database, userId: string) {
  return db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .get();
}

/**
 * アクセストークンの期限をチェックし、期限切れならリフレッシュする。
 * 有効なアクセストークンを返す。
 */
export async function getValidAccessToken(
  db: Database,
  userId: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const googleAccount = await getGoogleAccount(db, userId);
  if (!googleAccount || !googleAccount.accessToken) {
    return null;
  }

  // アクセストークンの期限チェック（5分のバッファ）
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;
  const expiresAt = googleAccount.accessTokenExpiresAt;

  if (expiresAt && expiresAt.getTime() - bufferMs > now.getTime()) {
    // まだ有効
    return googleAccount.accessToken;
  }

  // リフレッシュが必要
  if (!googleAccount.refreshToken) {
    return null;
  }

  const refreshed = await refreshAccessToken(
    googleAccount.refreshToken,
    clientId,
    clientSecret,
  );

  if (!refreshed) {
    return null;
  }

  // DBのトークンを更新
  await db
    .update(account)
    .set({
      accessToken: refreshed.access_token,
      accessTokenExpiresAt: new Date(
        Date.now() + refreshed.expires_in * 1000,
      ),
      updatedAt: new Date(),
    })
    .where(eq(account.id, googleAccount.id));

  return refreshed.access_token;
}

/**
 * リフレッシュトークンを使ってアクセストークンを更新する
 */
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      console.error(
        "Google token refresh failed:",
        res.status,
        await res.text(),
      );
      return null;
    }

    return (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
  } catch (err) {
    console.error("Google token refresh error:", err);
    return null;
  }
}

/**
 * Google Calendar FreeBusy APIを呼び出す
 */
export async function getFreeBusy(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
) {
  const res = await fetch(GOOGLE_FREEBUSY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: "Asia/Tokyo",
      items: calendarIds.map((id) => ({ id })),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`FreeBusy API error: ${res.status} ${errorText}`);
  }

  return res.json() as Promise<{
    kind: string;
    timeMin: string;
    timeMax: string;
    calendars: Record<
      string,
      {
        busy: Array<{ start: string; end: string }>;
        errors?: Array<{ domain: string; reason: string }>;
      }
    >;
  }>;
}
