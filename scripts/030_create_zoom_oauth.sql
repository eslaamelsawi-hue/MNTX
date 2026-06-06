-- Create table to store Zoom OAuth token
CREATE TABLE IF NOT EXISTS zoom_oauth_token (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE zoom_oauth_token ENABLE ROW LEVEL SECURITY;

-- Allow all operations (admin only, but secured by API)
CREATE POLICY "Allow all on zoom_oauth_token" ON zoom_oauth_token FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_zoom_oauth_token_expires ON zoom_oauth_token(expires_at);
