/**
 * JST/UTCタイムゾーンユーティリティ
 *
 * サーバー(Cloudflare Workers)はUTCで動作するため、
 * DB保存値はすべてUTC ISO文字列で統一する。
 * UI表示・入力はJST(Asia/Tokyo)で行い、このモジュール経由で変換する。
 */

/**
 * datetime-local入力値(JST想定)をUTC ISO文字列に変換
 * @example jstToUtc("2026-05-20T12:00") => "2026-05-20T03:00:00.000Z"
 */
export function jstToUtc(jstDateTimeLocal: string): string {
  const date = new Date(jstDateTimeLocal + "+09:00");
  return date.toISOString();
}

/**
 * UTC ISO文字列をdatetime-local用のJST文字列に変換
 * @example utcToJstLocal("2026-05-20T03:00:00.000Z") => "2026-05-20T12:00"
 */
export function utcToJstLocal(utcIsoString: string): string {
  const date = new Date(utcIsoString);
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const hours = String(jst.getUTCHours()).padStart(2, "0");
  const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 現在時刻をUTC ISO文字列で取得
 */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * UTC ISO文字列をJST表示用にフォーマット（日時）
 * @example formatDateTimeJst("2026-05-20T03:00:00.000Z") => "2026年5月20日 12:00"
 */
export function formatDateTimeJst(date: string | Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(date));
}

/**
 * UTC ISO文字列をJST表示用にフォーマット（日付のみ）
 * @example formatDateJst("2026-05-20T03:00:00.000Z") => "2026年5月20日"
 */
export function formatDateJst(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
    ...options,
  }).format(new Date(date));
}
