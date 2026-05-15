-- アンケート回答期限・イベント残席表示設定カラム追加
ALTER TABLE surveys ADD COLUMN deadline INTEGER;
ALTER TABLE events ADD COLUMN show_remaining_capacity INTEGER NOT NULL DEFAULT 0;
