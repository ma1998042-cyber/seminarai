.PHONY: dev build preview deploy db-generate db-migrate-local db-migrate-remote db-studio setup secret lint

# ローカル開発
dev:
	npm run dev

# ビルド
build:
	npm run build:worker

# ローカルプレビュー（Wrangler経由）
preview: build
	npm run preview

# デプロイ
deploy: build
	npm run deploy

# Drizzle マイグレーション生成
db-generate:
	npm run db:generate

# ローカルD1にマイグレーション適用
db-migrate-local:
	npx wrangler d1 execute seminar-crm-db --local --file=drizzle/migrations/0000_initial.sql
	npx wrangler d1 execute seminar-crm-db --local --file=drizzle/migrations/0001_add_payment_columns.sql
	npx wrangler d1 execute seminar-crm-db --local --file=drizzle/migrations/0002_clumsy_tana_nile.sql

# リモートD1にマイグレーション適用
db-migrate-remote:
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0000_initial.sql
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0001_add_payment_columns.sql
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0002_clumsy_tana_nile.sql

# Drizzle Studio
db-studio:
	npm run db:studio

# 初期セットアップ
setup:
	npm install
	@test -f .dev.vars || (echo "BETTER_AUTH_SECRET=$$(openssl rand -base64 32)" > .dev.vars && echo "BETTER_AUTH_URL=http://localhost:3000" >> .dev.vars && echo ".dev.vars created")
	$(MAKE) db-migrate-local

# 本番シークレット設定
secret:
	@echo "BETTER_AUTH_SECRET を入力してください:"
	npx wrangler secret put BETTER_AUTH_SECRET
	@echo "BETTER_AUTH_URL を入力してください:"
	npx wrangler secret put BETTER_AUTH_URL

# Lint
lint:
	npm run lint
