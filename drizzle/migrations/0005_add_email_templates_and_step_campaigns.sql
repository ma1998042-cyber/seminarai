-- email_templates テーブル作成
CREATE TABLE `email_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`preview_text` text,
	`body_html` text NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL DEFAULT (datetime('now')),
	`updated_at` text NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX `idx_email_templates_org` ON `email_templates` (`organization_id`);--> statement-breakpoint

-- step_campaigns テーブル作成
CREATE TABLE `step_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	`name` text NOT NULL,
	`description` text,
	`status` text NOT NULL DEFAULT 'draft',
	`trigger_type` text NOT NULL DEFAULT 'manual',
	`trigger_event_id` text,
	`trigger_tag_id` text,
	`created_by` text,
	`created_at` text NOT NULL DEFAULT (datetime('now')),
	`updated_at` text NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX `idx_step_campaigns_org` ON `step_campaigns` (`organization_id`);--> statement-breakpoint

-- step_campaign_steps テーブル作成
CREATE TABLE `step_campaign_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`step_campaign_id` text NOT NULL REFERENCES step_campaigns(id) ON DELETE CASCADE,
	`step_number` integer NOT NULL DEFAULT 1,
	`name` text,
	`delay_days` integer NOT NULL DEFAULT 0,
	`subject` text NOT NULL,
	`preview_text` text,
	`body_html` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE INDEX `idx_step_campaign_steps_campaign` ON `step_campaign_steps` (`step_campaign_id`);--> statement-breakpoint

-- step_campaign_enrollments テーブル作成
CREATE TABLE `step_campaign_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`step_campaign_id` text NOT NULL REFERENCES step_campaigns(id) ON DELETE CASCADE,
	`customer_id` text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
	`organization_id` text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	`status` text NOT NULL DEFAULT 'active',
	`current_step` integer NOT NULL DEFAULT 0,
	`enrolled_at` text NOT NULL DEFAULT (datetime('now'))
);--> statement-breakpoint
CREATE UNIQUE INDEX `step_enrollments_campaign_customer_unique` ON `step_campaign_enrollments` (`step_campaign_id`,`customer_id`);
