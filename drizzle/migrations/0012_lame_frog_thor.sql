CREATE TABLE `banners` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`image_url` text NOT NULL,
	`link_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_banners_org` ON `banners` (`organization_id`);--> statement-breakpoint
CREATE TABLE `customer_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_customer_statuses_org` ON `customer_statuses` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_statuses_org_name_unique` ON `customer_statuses` (`organization_id`,`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_email_sends` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`customer_id` text,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` text,
	`opened_at` text,
	`clicked_at` text,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_email_sends`("id", "campaign_id", "organization_id", "customer_id", "email", "status", "sent_at", "opened_at", "clicked_at", "error_message", "created_at") SELECT "id", "campaign_id", "organization_id", "customer_id", "email", "status", "sent_at", "opened_at", "clicked_at", "error_message", "created_at" FROM `email_sends`;--> statement-breakpoint
DROP TABLE `email_sends`;--> statement-breakpoint
ALTER TABLE `__new_email_sends` RENAME TO `email_sends`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_email_sends_campaign` ON `email_sends` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `__new_event_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`customer_id` text,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`status` text DEFAULT 'registered' NOT NULL,
	`registered_at` text DEFAULT (datetime('now')) NOT NULL,
	`checked_in_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_event_registrations`("id", "event_id", "customer_id", "organization_id", "email", "full_name", "status", "registered_at", "checked_in_at") SELECT "id", "event_id", "customer_id", "organization_id", "email", "full_name", "status", "registered_at", "checked_in_at" FROM `event_registrations`;--> statement-breakpoint
DROP TABLE `event_registrations`;--> statement-breakpoint
ALTER TABLE `__new_event_registrations` RENAME TO `event_registrations`;--> statement-breakpoint
CREATE UNIQUE INDEX `event_reg_event_email_unique` ON `event_registrations` (`event_id`,`email`);--> statement-breakpoint
CREATE TABLE `__new_survey_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`customer_id` text,
	`respondent_email` text,
	`respondent_name` text,
	`answers` text DEFAULT '{}' NOT NULL,
	`payment_status` text,
	`stripe_session_id` text,
	`ip_address` text,
	`user_agent` text,
	`submitted_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_survey_responses`("id", "survey_id", "organization_id", "customer_id", "respondent_email", "respondent_name", "answers", "payment_status", "stripe_session_id", "ip_address", "user_agent", "submitted_at") SELECT "id", "survey_id", "organization_id", "customer_id", "respondent_email", "respondent_name", "answers", "payment_status", "stripe_session_id", "ip_address", "user_agent", "submitted_at" FROM `survey_responses`;--> statement-breakpoint
DROP TABLE `survey_responses`;--> statement-breakpoint
ALTER TABLE `__new_survey_responses` RENAME TO `survey_responses`;--> statement-breakpoint
CREATE INDEX `idx_survey_responses_survey` ON `survey_responses` (`survey_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD `status_id` text REFERENCES customer_statuses(id);--> statement-breakpoint
ALTER TABLE `email_campaigns` ADD `format` text DEFAULT 'html' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `participation_requirements` text;--> statement-breakpoint
ALTER TABLE `events` ADD `registration_deadline` text;--> statement-breakpoint
ALTER TABLE `events` ADD `reminder_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `reminder_days` text DEFAULT '[1,3]' NOT NULL;--> statement-breakpoint
ALTER TABLE `surveys` ADD `completion_email_subject` text;--> statement-breakpoint
ALTER TABLE `surveys` ADD `completion_email_body` text;--> statement-breakpoint
ALTER TABLE `surveys` ADD `is_public` integer DEFAULT false NOT NULL;