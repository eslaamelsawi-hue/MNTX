-- Requests built on the "صمّم منتورشيبك" page. Nothing is charged when one is
-- submitted: an admin reviews it and, on approval, sets the final price, the
-- payment split and which payment methods the client may use. Approval mints
-- a single-use coupon and emails a checkout link, mirroring how approved
-- mentorship applications work.
CREATE TABLE IF NOT EXISTS public.custom_mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  telegram_username TEXT,

  -- What they built
  sessions SMALLINT NOT NULL CHECK (sessions BETWEEN 1 AND 12),
  focus_areas TEXT[],
  level TEXT,
  goals TEXT,
  -- The price the page quoted them, kept so an admin can see what they
  -- expected to pay before any adjustment.
  quoted_price NUMERIC NOT NULL,

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected')),

  -- Set at approval
  final_price NUMERIC,
  coupon_code TEXT,
  checkout_url TEXT,
  split_first_amount NUMERIC,
  split_second_amount NUMERIC,
  -- Which methods the checkout page offers: any of 'visa', 'okx', 'instapay'.
  payment_methods TEXT[],

  admin_notes TEXT,
  decline_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_mentorship_requests_status ON public.custom_mentorship_requests(status);
CREATE INDEX IF NOT EXISTS idx_custom_mentorship_requests_coupon ON public.custom_mentorship_requests(coupon_code);
CREATE INDEX IF NOT EXISTS idx_custom_mentorship_requests_created ON public.custom_mentorship_requests(created_at DESC);

ALTER TABLE public.custom_mentorship_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access" ON public.custom_mentorship_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
