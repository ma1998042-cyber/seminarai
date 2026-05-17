-- surveys テーブルに完了メールカラムを追加
ALTER TABLE `surveys` ADD COLUMN `completion_email_subject` text;--> statement-breakpoint
ALTER TABLE `surveys` ADD COLUMN `completion_email_body` text;
