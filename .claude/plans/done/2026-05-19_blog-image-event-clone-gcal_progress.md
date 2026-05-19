# 進捗: ブログ画像アップロード・イベント複製・Googleカレンダー空き日候補
最終更新: 2026-05-19T13:30:00

## 完了タスク
- [x] #1 アップロードAPI汎用化 (claude) → prefix対応追加（events, blogホワイトリスト）
- [x] #4 イベント複製API作成 (agent) → duplicateEventAction実装済み
- [x] #5 イベント詳細画面に複製ボタン (claude) → DuplicateEventButton.tsx作成
- [x] #6 Google Calendar API調査 (agent) → OAuth2推奨、方式B（カレンダー共有）、calendar.freebusyスコープ
- [x] #2 サムネイル/OG画像アップロードUI (agent) → ファイルアップロード+プレビュー追加
- [x] #3 本文画像挿入 (agent) → カーソル位置にimgタグ挿入機能追加

## 進行中
- [ ] #7 Google Calendar OAuth認証フロー実装 (agent) → 実行中

## 未着手
- [ ] #8 空き日候補表示UI (codex)

## 重要な判断・発見
- OAuth2一択（サービスアカウントは個人Gmailに使えない）
- 方式B推奨: 1人OAuth + もう1人はカレンダー共有設定
- better-auth accountテーブルにaccessToken/refreshToken保存可能
- スコープ: calendar.freebusy

## 次にやること
#7完了待ち → #8実行
