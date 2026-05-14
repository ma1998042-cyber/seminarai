-- surveys テーブルに決済関連カラムを追加
ALTER TABLE `surveys` ADD COLUMN `payment_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `surveys` ADD COLUMN `payment_amount` integer;
--> statement-breakpoint
-- survey_responses テーブルに決済ステータス関連カラムを追加
ALTER TABLE `survey_responses` ADD COLUMN `payment_status` text;
--> statement-breakpoint
ALTER TABLE `survey_responses` ADD COLUMN `stripe_session_id` text;
