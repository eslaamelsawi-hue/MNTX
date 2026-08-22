-- Links a client's site account (by email) to their real Discord account, so
-- the VIP MAX role can be granted/revoked via the Discord bot.
CREATE TABLE IF NOT EXISTS public.discord_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL UNIQUE,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  role_granted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.discord_links
  FOR ALL USING (true) WITH CHECK (true);
