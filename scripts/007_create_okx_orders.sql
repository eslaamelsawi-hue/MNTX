-- OKX crypto payment orders table
CREATE TABLE IF NOT EXISTS public.okx_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  amount TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  paid_at TIMESTAMPTZ,
  tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow service role full access (API routes use admin client)
ALTER TABLE public.okx_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.okx_orders
  FOR ALL USING (true) WITH CHECK (true);
