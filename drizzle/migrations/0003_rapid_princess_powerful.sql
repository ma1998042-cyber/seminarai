ALTER TABLE `email_campaigns` ADD `target_survey_id` text REFERENCES surveys(id);--> statement-breakpoint
ALTER TABLE `events` ADD `show_remaining_capacity` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `image_urls` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `surveys` ADD `deadline` integer;