-- Client comments on a published backtest report, shown below the video in
-- the client dashboard's Strategy Backtest tab.
CREATE TABLE IF NOT EXISTS public.backtest_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id UUID NOT NULL REFERENCES public.backtests(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backtest_comments_backtest ON public.backtest_comments(backtest_id);

ALTER TABLE public.backtest_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.backtest_comments
  FOR ALL USING (true) WITH CHECK (true);
