# 進捗: 公開サイト共通ヘッダー・フッター＋新セクション構築
最終更新: 2026-05-19T14:45:00
ステータス: 全タスク完了

## 完了タスク
- [x] #1 公開ページ共通レイアウト → src/app/(public)/layout.tsx, PublicHeader.tsx
- [x] #2 事例DBスキーマ＋管理画面CRUD → schema.ts, queries/caseStudies.ts, (dashboard)/cases/一式
- [x] #3 事例一覧 公開ページ → src/app/(public)/cases/page.tsx
- [x] #4 お役立ち資料DBスキーマ＋管理画面CRUD → schema.ts, queries/resources.ts, (dashboard)/resources/一式
- [x] #5 お役立ち資料 公開ページ → src/app/(public)/resources/page.tsx
- [x] #6 運営者情報 公開ページ → src/app/(public)/about/page.tsx
- [x] #7 法的ページ3種 → src/app/(public)/privacy/, terms/, legal/
- [x] #8 既存公開ページ統合 → events/public, articles, e/[eventId] を(public)配下に移動

## 重要な判断・発見
- codexがread-onlyサンドボックスで使用不可、全タスクclaude直接実行にフォールバック
- upload route.tsにcases, resources prefixを追加
- マイグレーション生成は未実施（手動で npm run db:generate → db:migrate:remote が必要）
