# SeminarFlow — セミナー後の追客を自動化するSaaS

セミナー講師・ウェビナー開催者・コンサルタント向けの、アンケート収集・顧客管理・メルマガ配信を一元管理するSaaSプラットフォームです。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **データベース**: Supabase (PostgreSQL + RLS)
- **認証**: Supabase Auth
- **課金**: Stripe
- **スタイリング**: Tailwind CSS

## 機能一覧

### ユーザー向け
- ✅ 組織管理（マルチテナント）
- ✅ メンバー招待・権限管理（オーナー/管理者/編集者/閲覧者）
- ✅ イベント管理（セミナー・ウェビナー・ワークショップ）
- ✅ アンケートビルダー（8種類の設問タイプ）
- ✅ 公開アンケートフォーム（/s/[id]）
- ✅ 顧客管理・タグ付け
- ✅ メルマガ配信（タグ別ターゲティング）
- ✅ プラン・課金管理（Stripe連携）
- ✅ オンボーディングフロー

### SaaS管理者向け
- ✅ 契約組織一覧
- ✅ 売上・利用状況
- ✅ プラン管理

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して以下を設定：

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### 2. Supabaseのセットアップ

Supabaseのダッシュボードで SQL Editor を開き、
`supabase/migrations/001_initial_schema.sql` の内容を実行します。

### 3. パッケージインストール

```bash
npm install
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## 料金プラン

| プラン | 価格 | イベント | 顧客 | メール |
|--------|------|----------|------|--------|
| Free | 無料 | 1件 | 100件 | 500通/月 |
| Basic | ¥3,800/月 | 10件 | 1,000件 | 5,000通/月 |
| Pro | ¥9,800/月 | 無制限 | 10,000件 | 50,000通/月 |
| Enterprise | 要相談 | 無制限 | 無制限 | 無制限 |

## データベース構造

- `organizations` — 組織（テナント）
- `organization_members` — 組織メンバー・権限
- `user_profiles` — ユーザープロフィール
- `plans` — 料金プラン
- `subscriptions` — サブスクリプション
- `events` — イベント
- `customers` — 顧客
- `tags` / `customer_tags` — タグ管理
- `surveys` / `survey_questions` — アンケート
- `survey_responses` — アンケート回答
- `email_campaigns` / `email_sends` — メルマガ配信
- `billing_history` — 請求履歴
- `invitations` — 招待
- `admin_users` — SaaS管理者

## ディレクトリ構成

```
src/
├── app/
│   ├── (dashboard)/          # ダッシュボード（認証必須）
│   │   ├── dashboard/        # ホーム
│   │   ├── events/           # イベント管理
│   │   ├── surveys/          # アンケート
│   │   ├── customers/        # 顧客管理
│   │   ├── campaigns/        # メルマガ
│   │   └── settings/         # 設定
│   ├── admin/                # SaaS管理者画面
│   ├── auth/                 # 認証ページ
│   ├── onboarding/           # 初回セットアップ
│   ├── s/[surveyId]/         # 公開アンケートフォーム
│   └── api/webhooks/stripe/  # Stripe webhook
├── components/
│   ├── dashboard/            # レイアウトコンポーネント
│   └── ui/                   # UIコンポーネント
├── lib/
│   ├── supabase/             # Supabaseクライアント
│   └── utils.ts              # ユーティリティ
├── middleware.ts              # 認証ミドルウェア
└── types/database.ts         # 型定義
```
