-- Tracks discount offers sent to individual clients from the admin
-- dashboard's "Discount Offers" tab — each one auto-generates a single-use
-- coupon (in the existing coupons table) and emails it to the client.
CREATE TABLE IF NOT EXISTS public.discount_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  plan TEXT NOT NULL,
  discount_percent NUMERIC NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_offers_email ON public.discount_offers(client_email);

ALTER TABLE public.discount_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.discount_offers
  FOR ALL USING (true) WITH CHECK (true);
