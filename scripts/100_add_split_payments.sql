-- Split payments: pay 60% at checkout, remaining 40% due within 30 days.
-- Adds the bookkeeping columns/tables needed to track a split OKX/NowPayments
-- order through to its invoice, and to let a client pay off a specific
-- outstanding installment later from their dashboard.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS plan TEXT;

ALTER TABLE public.okx_orders
  ADD COLUMN IF NOT EXISTS full_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS split_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.invoice_installments(id) ON DELETE SET NULL;

-- NowPayments has no persistent order record today (the webhook re-derives
-- the plan by regex-parsing order_id) — this table gives it one, which the
-- split-payment flow needs and which also lets the webhook use the exact
-- (possibly coupon-discounted) charged amount instead of guessing.
CREATE TABLE IF NOT EXISTS public.nowpayments_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  email TEXT NOT NULL,
  full_amount NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,
  split_payment BOOLEAN NOT NULL DEFAULT false,
  installment_id UUID REFERENCES public.invoice_installments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nowpayments_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.nowpayments_orders
  FOR ALL USING (true) WITH CHECK (true);
