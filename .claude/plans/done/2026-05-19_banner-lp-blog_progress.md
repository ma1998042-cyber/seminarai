# 進捗: バナー表示2件制限 + LP機能 + ブログ機能 + 公開イベントページ改善
最終更新: 2026-05-19T17:35:00

## 完了タスク
- [x] #1 バナー表示を縦2つまでに制限 (claude) → 完了。banners.tsにlimit(2)追加、管理画面で2件制限UI
- [x] #2 LP機能の設計 (gemini) → 完了。landing_pages + lp_submissionsテーブル設計、申込→顧客自動登録フロー設計
- [x] #6 ブログ機能の設計 (gemini) → 完了。blog_posts + blog_categories + blog_post_categoriesテーブル設計
- [x] #10 公開イベントページ改善 (claude) → 完了。種類フィルタ・検索・完売御礼表示

## LP設計要点(#2結果)
- landing_pages: id(nanoid), organizationId, title, slug(unique), bodyHtml, heroImageUrl, formFields(JSON), ctaText, thankYouMessage, isPublished(integer boolean), publishedAt, metaTitle, metaDescription, ogImageUrl, createdAt, updatedAt
- lp_submissions: id(nanoid), landingPageId(FK), customerId(nullable FK→customers), data(JSON), ipAddress, userAgent, createdAt
- 申込フロー: email検索→既存顧客なければ新規作成(source="LP: {title}")
- 公開URL: /lp/[slug]、管理画面: /dashboard/landing-pages/*

## ブログ設計要点(#6結果)
- blog_posts: id(nanoid), organizationId, title, slug(org内unique), bodyHtml, excerpt, thumbnailUrl, status(draft/published), publishedAt, authorId(FK→userProfiles), metaTitle, metaDescription, ogImageUrl, createdAt, updatedAt
- blog_categories: id(nanoid), organizationId, name, slug(org内unique), sortOrder, createdAt
- blog_post_categories: postId(FK), categoryId(FK) - 多対多
- エディタ: TipTapを推奨（軽量、SSR不要、Cloudflare Workers互換）

## 進行中
- [ ] #3 LP用DBスキーマ・マイグレーション追加 (codex) → 実行中
- [ ] #7 ブログ用DBスキーマ・マイグレーション追加 (codex) → 実行中

## 未着手
- [ ] #4 LP管理画面(CRUD) (codex) → #3待ち
- [ ] #5 LP公開ページ (codex) → #3待ち
- [ ] #8 ブログ管理画面 (codex) → #7待ち
- [ ] #9 ブログ公開ページ (codex) → #7待ち

## 次にやること
第2バッチ: #3, #7を並行実行（Codex）
