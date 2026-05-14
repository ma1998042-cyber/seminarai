ALTER TABLE `events` ADD `visibility` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_events_visibility` ON `events` (`organization_id`,`visibility`);--> statement-breakpoint
ALTER TABLE `surveys` ADD `category` text DEFAULT 'general' NOT NULL;