-- イベントテーブルに参加条件カラムを追加
ALTER TABLE `events` ADD COLUMN `participation_requirements` text;
