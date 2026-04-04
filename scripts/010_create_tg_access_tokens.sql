-- Table to store pre-generated BotSubscription access tokens.
-- Tokens are created in bulk via the Telegram bot (/members → Add/Delete access token → Create new)
-- then uploaded to this table. Each token is consumed once when a Starter plan buyer pays.

CREATE TABLE IF NOT EXISTS tg_access_tokens (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token      TEXT        NOT NULL UNIQUE,
  plan       TEXT        NOT NULL DEFAULT 'starter',
  used       BOOLEAN     NOT NULL DEFAULT false,
  used_at    TIMESTAMPTZ,
  order_ref  TEXT,                        -- OKX order ID / Stripe session ID / NowPayments payment ID
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Only service-role can write; unauthenticated reads are blocked
ALTER TABLE tg_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON tg_access_tokens
  USING (auth.role() = 'service_role');
