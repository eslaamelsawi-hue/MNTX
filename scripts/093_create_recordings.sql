-- Session recording metadata (the actual video bytes live in Supabase
-- Storage, see scripts/092_create_private_media_bucket.sql). Without this
-- table, lib/recordings-store.ts silently falls back to a local JSON file —
-- reads still work off whatever was bundled at build time, but writes never
-- persist on Vercel, so uploads appear to succeed but the list reverts.
CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  title TEXT NOT NULL,
  video TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recordings_email ON recordings(email);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on recordings"
  ON recordings FOR ALL
  USING (true) WITH CHECK (true);
