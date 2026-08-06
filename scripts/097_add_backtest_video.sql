-- Optional video walkthrough per backtest report, stored in the private-media
-- bucket and served through a signed, access-gated stream route.
ALTER TABLE public.backtests ADD COLUMN IF NOT EXISTS video TEXT;
