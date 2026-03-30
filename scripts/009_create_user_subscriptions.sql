
-- User subscriptions table for tracking mentorship hours
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  plan TEXT NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 4,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  remaining_hours NUMERIC GENERATED ALWAYS AS (total_hours - used_hours) STORED,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_subs_email ON user_subscriptions(client_email);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on user_subscriptions"
  ON user_subscriptions FOR ALL
  USING (true) WITH CHECK (true);
