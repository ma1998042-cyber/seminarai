ALTER TABLE `event_registrations` ADD `notification_consent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `recommended_for` text;--> statement-breakpoint
ALTER TABLE `events` ADD `participation_benefits` text;