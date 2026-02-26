-- Gold Analysis Articles table
CREATE TABLE IF NOT EXISTS gold_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fetching published articles sorted by date
CREATE INDEX idx_gold_articles_published ON gold_articles (published, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_gold_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gold_articles_updated_at
  BEFORE UPDATE ON gold_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_gold_articles_updated_at();

-- Enable RLS
ALTER TABLE gold_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Public can read published gold articles"
  ON gold_articles FOR SELECT
  USING (published = true);

-- Anon key can do everything (admin routes are cookie-protected)
CREATE POLICY "Service can manage gold articles"
  ON gold_articles FOR ALL
  USING (true)
  WITH CHECK (true);
