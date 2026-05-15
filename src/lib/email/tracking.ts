/**
 * メール開封・クリックトラッキング用のHTML加工ユーティリティ
 */

/**
 * HTML末尾（</body>前）に1x1透過GIFのトラッキングピクセルを挿入する
 */
export function addTrackingPixel(
  html: string,
  sendId: string,
  baseUrl: string,
): string {
  const pixelUrl = `${baseUrl}/api/track/open/${encodeURIComponent(sendId)}`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;

  // </body> があればその直前に、なければ末尾に追加
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixelTag}</body>`);
  }
  return html + pixelTag;
}

/**
 * HTML内の<a href="...">リンクをクリックトラッキング用URLに書き換える
 * mailto:, tel:, #, javascript: スキームは除外
 */
export function rewriteLinks(
  html: string,
  sendId: string,
  baseUrl: string,
): string {
  const excludePatterns = /^(mailto:|tel:|#|javascript:)/i;

  return html.replace(
    /<a\s([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      if (excludePatterns.test(url.trim())) {
        return match;
      }
      const trackUrl = `${baseUrl}/api/track/click/${encodeURIComponent(sendId)}?url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    },
  );
}
