-- Tracks Whop (card/Visa) checkout orders, mirroring nowpayments_orders —
-- created when a checkout link is issued, marked paid by the payment.succeeded
-- webhook, which is the only thing that actually grants access (never the
-- browser-side success-page redirect).
CREATE TABLE IF NOT EXISTS public.whop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  email TEXT NOT NULL,
  telegram_username TEXT,
  full_amount NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,
  checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whop_orders_order_id ON public.whop_orders(order_id);

ALTER TABLE public.whop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.whop_orders
  FOR ALL USING (true) WITH CHECK (true);
