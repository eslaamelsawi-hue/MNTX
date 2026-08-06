-- Strategy backtest reports, published by admins and viewed by premium
-- (active-subscription) clients in the dashboard's "Strategy Backtest" tab.
CREATE TABLE IF NOT EXISTS public.backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  win_rate NUMERIC,
  total_trades INTEGER NOT NULL DEFAULT 0,
  profit_factor NUMERIC,
  net_profit_pct NUMERIC,
  max_drawdown_pct NUMERIC,
  cover_image_url TEXT,
  -- Array of trade records: [{ date, direction, entry, exit, pnl, pnl_pct, result }]
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (backtest, client) so repeat views by the same person only
-- ever count once.
CREATE TABLE IF NOT EXISTS public.backtest_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id UUID NOT NULL REFERENCES public.backtests(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (backtest_id, client_email)
);

CREATE INDEX IF NOT EXISTS idx_backtest_views_backtest ON public.backtest_views(backtest_id);
CREATE INDEX IF NOT EXISTS idx_backtests_published ON public.backtests(published);

ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.backtests
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.backtest_views
  FOR ALL USING (true) WITH CHECK (true);
