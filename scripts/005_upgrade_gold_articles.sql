-- Add image_url, summary, and tags to gold_articles
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS summary_en TEXT DEFAULT '';
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS summary_ar TEXT DEFAULT '';
ALTER TABLE gold_articles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

