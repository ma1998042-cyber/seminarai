# 進捗: メルマガ機能の拡充
最終更新: 2026-05-15 開始

## 完了タスク
- [x] #1 キャンペーン詳細ページ作成 (claude fallback) → コミットf0e510aで実装済み
- [x] #3 予約配信のスケジューラー技術調査 (gemini) → 推奨: Cloudflare Cron Triggers + API Route方式
- [x] #5 テンプレートからキャンペーン作成機能 (claude) → コミットd157da0で実装済み

## 進行中
- [ ] #2 キャンペーン一覧からの操作改善 (claude) → 実行中
- [ ] #4 予約配信の実行エンジン実装 (claude fallback) → 実行中

## 未着手
- [ ] #6 ステップ配信の送信実行エンジン実装 → #4に依存

## 重要な判断・発見
- スケジューラー推奨方式: **Cloudflare Cron Triggers + Next.js API Route (Internal Fetch)**
  - Workerラッパー(src/worker-wrapper.ts)でscheduledイベントをハンドル → API Route(/api/cron/process-emails)を内部fetch
  - wrangler.tomlに[triggers] crons = ["*/5 * * * *"]を追加
  - 長期予約対応可、Durable Objects不要、ロジックをNext.js内に一元化
  - 代替案: Brevo API scheduledAt（72時間制限、実装最短）
  - OpenNextのworker.jsをラップするカスタムエントリポイントが必要

## 重要メモ
- Codexはread-onlyサンドボックスで書き込み不可。T1,T4共にClaude Codeにフォールバック

## 次にやること
#2, #4の完了を待つ → #6を実行 → 全体デプロイ
