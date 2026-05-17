-- customer_statuses テーブル作成（習熟度）
CREATE TABLE `customer_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	`name` text NOT NULL,
	`color` text NOT NULL DEFAULT '#6366f1',
	`sort_order` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX `idx_customer_statuses_org` ON `customer_statuses` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_statuses_org_name_unique` ON `customer_statuses` (`organization_id`, `name`);--> statement-breakpoint
-- customers テーブルに status_id カラム追加
ALTER TABLE `customers` ADD COLUMN `status_id` text REFERENCES customer_statuses(id);
