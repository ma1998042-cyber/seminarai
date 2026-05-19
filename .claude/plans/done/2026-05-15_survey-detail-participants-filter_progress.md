# 進捗: アンケート回答詳細・イベント参加者リスト・事前事後アンケート・メルマガ回答者フィルタ対応
最終更新: 2026-05-15T21:40:00

## 完了タスク
- [x] #4 アンケートUIに事前/事後カテゴリ制御を追加 (claude)
  - NewSurveyForm: イベント未選択時は事前/事後を非表示
  - SurveyEditForm: hasEvent propで制御
  - surveys/[id]/page.tsx: カテゴリバッジ表示追加
- [x] #5 メルマガに「アンケート回答者」フィルタを追加 (claude)
  - schema: emailCampaigns に targetSurveyId カラム追加
  - campaigns/new/actions.ts: getSurveysForOrg, getCustomersByTarget にsurvey_respondents対応
  - campaigns/new/page.tsx: アンケート回答者ターゲット選択UI追加

## 進行中（サブエージェント）
- [ ] #1 アンケート回答詳細ページ作成
- [ ] #2 アンケート回答一覧ページ作成
- [ ] #3 イベント参加者リストページ作成

## 重要な判断・発見
- DB マイグレーション履歴がずれている（d1_migrationsテーブルが空）→ 直接ALTER TABLEで対応
- カテゴリ選択UIは既に存在していた。制御ロジック（イベント紐付け時のみ事前/事後表示）を追加

## 次にやること
サブエージェント#1, #2, #3 の完了を待つ → コミット → デプロイ
