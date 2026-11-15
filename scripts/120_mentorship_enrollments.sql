-- Approving a 1-on-1 application now creates the order up front, and paying
-- it grants the sessions and invites the client to register.
--
-- Also re-adds the two-payment columns from 114, which never reached
-- production: approvals with a split failed to save, so the client got a
-- full-payment link and the application fell back to "new".

ALTER TABLE public.mentorship_applications
  ADD COLUMN IF NOT EXISTS split_first_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS split_second_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.mentorship_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.mentorship_applications(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  coupon_code TEXT NOT NULL UNIQUE,
  checkout_url TEXT,
  sessions INTEGER NOT NULL CHECK (sessions > 0),
  total_amount NUMERIC NOT NULL,
  split_first_amount NUMERIC,
  split_second_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'paid', 'cancelled')),
  order_ref TEXT,
  paid_at TIMESTAMPTZ,
  register_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_enrollments_email ON public.mentorship_enrollments(email);
CREATE INDEX IF NOT EXISTS idx_mentorship_enrollments_application ON public.mentorship_enrollments(application_id);

ALTER TABLE public.mentorship_enrollments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access" ON public.mentorship_enrollments
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
