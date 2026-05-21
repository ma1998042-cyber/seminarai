/**
 * OpenNext ワーカーのラッパー
 * fetch ハンドラはOpenNextに委譲し、scheduled ハンドラ（Cron Trigger）を追加する
 */

// OpenNext の named exports（Durable Objects）を再エクスポート
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

// OpenNext の default export（fetch ハンドラ）を取得
import openNextWorker from "./.open-next/worker.js";

export default {
  // HTTP リクエストはOpenNextにそのまま委譲
  fetch: openNextWorker.fetch,

  // Cloudflare Cron Trigger で定期実行される
  async scheduled(event, env, ctx) {
    const baseUrl = `https://seminar-crm.foritemaqua.workers.dev`;
    const secret = env.CRON_SECRET;

    if (!secret) {
      console.error("CRON_SECRET is not set");
      return;
    }

    const endpoints = [
      "/api/cron/send-scheduled",
      "/api/cron/send-reminders",
      "/api/cron/process-sequences",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const body = await response.text();
        console.log(`Cron ${endpoint}: ${response.status} - ${body}`);
      } catch (error) {
        console.error(`Cron ${endpoint} failed:`, error);
      }
    }
  },
};
