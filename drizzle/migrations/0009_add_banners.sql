-- banners テーブル作成
CREATE TABLE `banners` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	`title` text NOT NULL,
	`image_url` text NOT NULL,
	`link_url` text NOT NULL,
	`sort_order` integer NOT NULL DEFAULT 0,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX `idx_banners_org` ON `banners` (`organization_id`);
