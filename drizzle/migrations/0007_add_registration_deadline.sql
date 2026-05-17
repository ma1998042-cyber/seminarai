-- イベントテーブルに申し込み期限カラムを追加
ALTER TABLE `events` ADD COLUMN `registration_deadline` text;
