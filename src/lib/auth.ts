import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import * as authSchema from "@/lib/db/auth-schema";

/**
 * Better Auth サーバーインスタンスを取得する。
 * Cloudflare Workers/Pages環境ではリクエストコンテキスト内でのみ
 * D1バインディングにアクセスできるため、遅延初期化を行う。
 */
export function getAuth() {
  const { env } = getCloudflareContext();
  const db = getDb(env.DB);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || undefined,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    user: {
      additionalFields: {
        fullName: {
          type: "string",
          required: false,
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path.startsWith("/sign-up")) {
          const newSession = ctx.context.newSession;
          if (newSession) {
            await db.insert(userProfiles).values({
              id: newSession.user.id,
              fullName: newSession.user.name ?? null,
            });
          }
        }
      }),
    },
  });
}

/**
 * 型推論用のダミーインスタンス（実行時には使わない）。
 * getAuth() の戻り値から Session 型を推論するために利用。
 */
export type Auth = ReturnType<typeof getAuth>;
export type Session = ReturnType<typeof getAuth>["$Infer"]["Session"];
