# 進捗: アンケート分析・回答改善・イベント連携強化・リマインド配信
最終更新: 2026-05-15T15:38:00

## 完了タスク
- [x] #1 DBスキーマ拡張 (claude/self) → 完了。surveys.deadline, events.showRemainingCapacity 追加。D1マイグレーション適用済み。コミット: 7e64971
- [x] #3 アンケート回答後メッセージの改行対応 (claude) → 完了。whitespace-pre-wrap適用、input→textarea変更。コミット: 54d73a9
- [x] #8 セミナー前リマインド配信機能 調査 (gemini) → 完了。Resend推奨、Custom Worker+Cron Triggers、event_remindersテーブル設計案

## 進行中
- [ ] #2 アンケート回答分析ページの作成 (codex) → 実行中
- [ ] #4 アンケート回答時のイベント参加人数カウント修正 (claude) → 実行中
- [ ] #5 アンケート回答期限の設定・表示・制御 (claude) → 実行中
- [ ] #6 申し込みアンケート未設定イベントの警告表示 (claude) → 実行中
- [ ] #7 イベント一覧の残席表示設定 (claude) → 実行中

## 未着手
(なし)

## 重要な判断・発見
- Codex は read-only sandbox で実行されるため、ファイル書き込みができない場合がある → フォールバックでClaude自身が実装
- wrangler d1 migrations apply はアカウント権限エラー → wrangler d1 execute で直接SQL実行が有効
- drizzle/migrations/meta/_journal.json に 0003 エントリがない不整合あり（手動マイグレーションSQLファイルのみ存在）

## 次にやること
全サブエージェント完了を待ち、結果確認・コミット → デプロイ
