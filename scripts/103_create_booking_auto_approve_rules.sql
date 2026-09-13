-- Per-client rules that let a custom time request skip admin approval and
-- confirm automatically. A rule with day_of_week/start_time/end_time all
-- NULL matches any date/time (a blanket auto-approve for that client).
-- day_of_week: 0 = Sunday ... 6 = Saturday (matches JS Date#getUTCDay()).
-- start_time/end_time are Africa/Cairo local wall-clock times.
CREATE TABLE IF NOT EXISTS public.booking_auto_approve_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_auto_approve_rules_email ON public.booking_auto_approve_rules(client_email);

ALTER TABLE public.booking_auto_approve_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.booking_auto_approve_rules
  FOR ALL USING (true) WITH CHECK (true);
