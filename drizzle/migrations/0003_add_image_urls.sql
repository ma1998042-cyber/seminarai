-- 複数画像対応: image_urls カラム追加
ALTER TABLE events ADD COLUMN image_urls TEXT DEFAULT '[]';

-- 既存の thumbnail_url を image_urls に移行
UPDATE events SET image_urls = json_array(thumbnail_url) WHERE thumbnail_url IS NOT NULL AND thumbnail_url != '';
