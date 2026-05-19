CREATE TABLE `resource_download_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`proficiency_level` text NOT NULL,
	`goals` text NOT NULL,
	`job_description` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_download_leads_resource` ON `resource_download_leads` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_download_leads_email` ON `resource_download_leads` (`email`);--> statement-breakpoint
ALTER TABLE `resources` ADD `file_url` text;