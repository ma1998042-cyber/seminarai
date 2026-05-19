# 進捗: イベント管理画面の改善（複数削除・タブ分け・リマインドメール編集）
最終更新: 2026-05-17T13:00:00

## 完了タスク
- [x] #1 イベント一覧タブ分け (claude) → events/page.tsx にタブUI追加、getEvents/countEventsにendedフィルタ追加
- [x] #3 リマインドメールスキーマ拡張 (claude) → schema.ts/queries追加、migration 0014作成
- [x] #6 アンケート保存エラー修正 (claude) → マイグレーション不整合修正、リモートDB適用・デプロイ済み

## 進行中
- [ ] #2 イベント一覧に複数選択＆一括削除機能を追加 (claude) → 実行中
- [ ] #4 リマインドメール内容の表示・編集UI (claude) → 実行中
- [ ] #5 cron送信処理をDBテンプレート参照に変更 (claude) → 実行中

## 未着手
(なし)

## 重要な判断・発見
- マイグレーション番号整理: 0014→0013(completion_email_enabled)、0015→0014(reminder_template)
- リモートDBにd1_migrationsレコード手動挿入で整合性回復
- デプロイ済み（completion_email + reminder_template両方適用済み）

## 次にやること
#2, #4, #5 の並行実行完了を待つ
