-- Manual Egyptian payments (Instapay / Vodafone Cash). Unlike card or crypto
-- orders there is no provider to ask whether money arrived, so each order
-- carries the customer's proof of transfer and is only ever marked paid by an
-- admin who has looked at it:
--
--   awaiting_payment     → checkout opened, nothing sent yet
--   pending_verification → proof uploaded, waiting on an admin
--   paid                 → admin verified the transfer and access was granted
--   rejected             → admin rejected it (reason in admin_note)
--
-- Amounts are recomputed server-side when the order is created, so the
-- browser can never dictate what the customer owes.
CREATE TABLE IF NOT EXISTS public.instapay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  email TEXT NOT NULL,
  telegram_username TEXT,
  full_amount NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,
  amount_egp NUMERIC NOT NULL,
  usd_to_egp NUMERIC,
  split_payment BOOLEAN NOT NULL DEFAULT false,
  coupon_code TEXT,
  preferred_date TIMESTAMPTZ,
  preferred_slot_id TEXT,
  sender_name TEXT,
  sender_number TEXT,
  proof_key TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'pending_verification', 'paid', 'rejected')),
  admin_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instapay_orders_order_id ON public.instapay_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_instapay_orders_status ON public.instapay_orders(status);

ALTER TABLE public.instapay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.instapay_orders
  FOR ALL USING (true) WITH CHECK (true);
