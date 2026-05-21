CREATE TABLE `content_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`workshop_content_id` text,
	`event_id` text NOT NULL,
	`survey_response_id` text NOT NULL,
	`customer_id` text,
	`token` text NOT NULL,
	`accessed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`workshop_content_id`) REFERENCES `workshop_contents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`survey_response_id`) REFERENCES `survey_responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_access_tokens_token_unique` ON `content_access_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_content_access_tokens_event` ON `content_access_tokens` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_content_access_tokens_token` ON `content_access_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`inquiry_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_services_org` ON `services` (`organization_id`);--> statement-breakpoint
CREATE TABLE `workshop_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content_type` text DEFAULT 'manual' NOT NULL,
	`file_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_workshop_contents_org` ON `workshop_contents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_workshop_contents_event` ON `workshop_contents` (`event_id`);