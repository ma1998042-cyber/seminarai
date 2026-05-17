-- イベントリマインド配信カラム追加
ALTER TABLE `events` ADD COLUMN `reminder_enabled` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `reminder_days` text NOT NULL DEFAULT '[1,3]';
