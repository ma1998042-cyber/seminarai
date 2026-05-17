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
	npx wrangler d1 execute seminar-crm-db --local --file=drizzle/migrations/0003_add_image_urls.sql

# リモートD1にマイグレーション適用
db-migrate-remote:
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0000_initial.sql
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0001_add_payment_columns.sql
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0002_clumsy_tana_nile.sql
	npx wrangler d1 execute seminar-crm-db --remote --file=drizzle/migrations/0003_add_image_urls.sql

# Drizzle Studio
db-studio:
	npm run db:studio

# 初期セットアップ
setup:
	npm install
	@test -f .dev.vars || (echo "BETTER_AUTH_SECRET=$$(openssl rand -base64 32)" > .dev.vars && echo "BETTER_AUTH_URL=http://localhost:3000" >> .dev.vars && echo ".dev.vars created")
	$(MAKE) db-migrate-local

# 本番シークレット設定（.dev.varsから一括デプロイ）
secret:
	@cat .dev.vars | while IFS='=' read -r key value; do \
		[ -z "$$key" ] && continue; \
		echo "Setting $$key ..."; \
		echo "$$value" | npx wrangler secret put "$$key"; \
	done
	@echo "全シークレットを設定しました"

# Lint
lint:
	npm run lint
