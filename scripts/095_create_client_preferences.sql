-- Per-client preferences (currently just the email-notifications opt-out).
CREATE TABLE IF NOT EXISTS public.client_preferences (
  client_email TEXT PRIMARY KEY,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.client_preferences
  FOR ALL USING (true) WITH CHECK (true);
