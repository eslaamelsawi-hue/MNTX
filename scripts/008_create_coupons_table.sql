-- Create coupons table for discount code system
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  min_order_cents INTEGER DEFAULT 0,
  applicable_plans TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to read active coupons" ON coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow service role full access" ON coupons
  FOR ALL USING (true) WITH CHECK (true);