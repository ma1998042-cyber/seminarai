import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

let _db: Database | null = null;

export function getDb(d1?: CloudflareEnv["DB"]): Database {
  if (d1) {
    return drizzle(d1, { schema });
  }
  if (_db) return _db;
  throw new Error("D1 database not initialized. Call getDb(d1) first.");
}

/**
 * Cloudflare Pages環境からD1を取得するヘルパー
 * Server Components / Server Actions / Route Handlers から利用可能
 *
 * getCloudflareContext() は同期関数（async: false がデフォルト）。
 * リクエストコンテキスト内（Server Components, Server Actions, Route Handlers）で呼び出すこと。
 */
export function getDbFromContext(): Database {
  const { env } = getCloudflareContext();
  return getDb(env.DB);
}
