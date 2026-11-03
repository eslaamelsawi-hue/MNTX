-- Every Whop payment we've acted on, keyed by Whop's own payment id.
--
-- Split-pay orders receive a second payment.succeeded about 30 days after the
-- first, for the same order. Without recording individual payments we can't
-- tell that renewal apart from Whop redelivering the first one — and the
-- difference decides whether an invoice instalment gets settled. The primary
-- key makes claiming a payment atomic.
CREATE TABLE IF NOT EXISTS public.whop_processed_payments (
  payment_id TEXT PRIMARY KEY,
  order_id TEXT,
  kind TEXT NOT NULL DEFAULT 'initial' CHECK (kind IN ('initial', 'renewal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whop_processed_payments_order ON public.whop_processed_payments(order_id);

ALTER TABLE public.whop_processed_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.whop_processed_payments
  FOR ALL USING (true) WITH CHECK (true);
