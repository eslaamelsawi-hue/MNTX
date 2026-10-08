-- Lets a Whop (Visa/card) checkout be split 60% now / 40% due in 30 days,
-- matching the existing okx_orders/nowpayments_orders split-payment columns.
ALTER TABLE public.whop_orders
  ADD COLUMN IF NOT EXISTS split_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.invoice_installments(id) ON DELETE SET NULL;
