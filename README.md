# SeminarFlow — セミナー後の追客を自動化するSaaS

セミナー講師・ウェビナー開催者・コンサルタント向けの、アンケート収集・顧客管理・メルマガ配信を一元管理するSaaSプラットフォームです。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **データベース**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **認証**: Auth.js v5 (NextAuth)
- **デプロイ**: Cloudflare Pages
- **スタイリング**: Tailwind CSS

## 機能一覧

### 公開
- ✅ イベント一覧ページ（`/events`）— セミナー・勉強会の日程・申込フォーム
- ✅ 公開アンケートフォーム（`/s/[id]`）

### ユーザー向け
- ✅ 組織管理（マルチテナント）
- ✅ メンバー招待・権限管理（オーナー/管理者/編集者/閲覧者）
- ✅ イベント管理（セミナー・ウェビナー・ワークショップ）
- ✅ アンケートビルダー（8種類の設問タイプ）
- ✅ 顧客管理・タグ付け
- ✅ メルマガ配信（タグ別ターゲティング）
- ✅ オンボーディングフロー

### SaaS管理者向け
- ✅ 契約組織一覧
- ✅ 利用状況
- ✅ プラン管理

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
AUTH_SECRET=<openssl rand -base64 32 で生成>
CLOUDFLARE_ACCOUNT_ID=<Cloudflareダッシュボードで確認>
CLOUDFLARE_D1_DATABASE_ID=<作成したD1のID>
CLOUDFLARE_D1_TOKEN=<CloudflareのAPIトークン>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Cloudflare D1 データベース作成

```bash
wrangler d1 create seminar-flow-db
```

表示された `database_id` を `wrangler.toml` と `.env.local` に設定します。

### 3. マイグレーション

```bash
# スキーマからSQLを生成
npm run db:generate

# ローカルD1に適用
npm run db:migrate

# 本番D1に適用
npm run db:migrate:prod
```

### 4. パッケージインストール

```bash
npm install
```

### 5. 開発サーバー起動

```bash
npm run dev
```

D1はローカルでも `wrangler dev` が自動的に起動します（`next.config.mjs` の `setupDevPlatform()` で設定済み）。

### 6. Cloudflare Pages へのデプロイ

```bash
# ビルド
npm run pages:build

# プレビュー（ローカル）
npm run preview
```

または GitHub と Cloudflare Pages を連携してCI/CDを設定します。

## 公開イベントページ

`/events` — すべての組織のアクティブなイベントを一覧表示します。

クエリパラメータで絞り込みが可能：
- `?org=<スラッグ>` — 特定組織のイベントのみ表示
- `?type=seminar|webinar|workshop|course` — 種別で絞り込み

例: `https://your-domain/events?org=your-company&type=seminar`

## データベース構造

| テーブル | 説明 |
|---------|------|
| `users` | ユーザー（Auth.js管理） |
| `organizations` | 組織（テナント） |
| `organization_members` | 組織メンバー・権限 |
| `user_profiles` | ユーザープロフィール |
| `plans` | 料金プラン |
| `subscriptions` | サブスクリプション |
| `events` | イベント |
| `event_registrations` | イベント参加者 |
| `customers` | 顧客 |
| `tags` / `customer_tags` | タグ管理 |
| `surveys` / `survey_questions` | アンケート |
| `survey_responses` | アンケート回答 |
| `email_campaigns` / `email_sends` | メルマガ配信 |
| `invitations` | 招待 |
| `admin_users` | SaaS管理者 |

## ディレクトリ構成

```
src/
├── app/
│   ├── (dashboard)/          # ダッシュボード（認証必須）
│   │   ├── dashboard/        # ホーム
│   │   ├── events/           # イベント管理（管理画面）
│   │   ├── surveys/          # アンケート
│   │   ├── customers/        # 顧客管理
│   │   ├── campaigns/        # メルマガ
│   │   └── settings/         # 設定
│   ├── events/               # 公開イベント一覧（/events）
│   ├── admin/                # SaaS管理者画面
│   ├── auth/                 # 認証ページ
│   ├── api/auth/             # Auth.js ルートハンドラ
│   ├── onboarding/           # 初回セットアップ
│   └── s/[surveyId]/         # 公開アンケートフォーム
├── lib/
│   ├── auth.ts               # Auth.js設定
│   ├── session.ts            # セッションヘルパー
│   ├── db/
│   │   ├── schema.ts         # Drizzleスキーマ（D1/SQLite）
│   │   └── index.ts          # DBクライアント
│   └── utils.ts              # ユーティリティ
├── middleware.ts              # 認証ミドルウェア
└── types/database.ts         # 型定義（旧Supabase用、削除可）
```
