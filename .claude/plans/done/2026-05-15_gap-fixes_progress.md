# 進捗: Gap分析で見つかった改善ポイント15件を解消する
最終更新: 2026-05-15T13:10:00

## 完了タスク
- [x] #1 ステップ配信のセキュリティ修正 (claude) → saveStep/deleteStepにorg検証、getSequenceDataに認証チェック追加
- [x] #2 イベントの削除機能 (claude) → deleteEventAction + DeleteEventButton + 詳細画面に配置
- [x] #3 アンケートの削除機能 (claude) → deleteSurveyAction + DeleteSurveyButton + 詳細画面に配置
- [x] #4 ステップ配信の削除機能 (claude) → deleteSequenceAction + 削除ボタン（確認モーダル付き）
- [x] #5 キャンペーンHTML XSS対策 (claude) → dompurifyパッケージ追加、DOMPurify.sanitize()適用
- [x] #14 エラーハンドリング追加 (claude) → campaigns/[id]とsequences/[id]にtry/catch+リトライUI
- [x] #15 error.tsx/loading.tsx (claude) → dashboard/error.tsx, dashboard/loading.tsx, app/error.tsx作成

## 進行中
- [ ] #7 タグ名・色の編集機能 (claude fallback) → Codex read-onlyでフォールバック
- [ ] #8 メール開封率・クリック率トラッキング (codex)
- [ ] #9 顧客一覧にページネーション (codex)

## 未着手
- [ ] #6 ステップ配信のステップ編集 (codex) [M] ← #1完了済み、実行可能
- [ ] #10 イベント一覧にページネーション (codex) [M] ← #9待ち
- [ ] #11 アンケート一覧にページネーション (codex) [M] ← #9待ち
- [ ] #12 キャンペーン一覧にページネーション (codex) [M] ← #9待ち
- [ ] #13 顧客一覧のタグ絞り込みサーバー側移行 (codex) [M] ← #9待ち

## 重要な判断・発見
- Codexはread-onlyモードでファイル書き込み不可。全タスクClaude Codeにフォールバック
- isomorphic-dompurifyではなくdompurifyを採用（Workers環境でjsdom使えないため）
- サブエージェントが自動コミットするケースあり

## 次にやること
- #7完了待ち
- #8, #9 Codex完了待ち（失敗ならClaude fallback）
- #1完了済みなので#6を開始可能
