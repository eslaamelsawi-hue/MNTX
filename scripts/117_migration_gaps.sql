-- Columns and tables that exist in the live database but were never written
-- to a migration file (added straight from the dashboard). Needed so a fresh
-- project built from scripts/*.sql matches what the app actually expects.
CREATE TABLE IF NOT EXISTS public.extend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  telegram TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extend_requests_order_id ON public.extend_requests(order_id);

ALTER TABLE public.extend_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access" ON public.extend_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.course_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.mentorship_applications ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE public.mentorship_applications ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Set when a crypto/card order settles one invoice instalment rather than
-- buying a plan outright.
ALTER TABLE public.okx_orders ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.invoice_installments(id) ON DELETE SET NULL;
ALTER TABLE public.okx_orders ADD COLUMN IF NOT EXISTS split_payment BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.whop_orders ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.invoice_installments(id) ON DELETE SET NULL;
