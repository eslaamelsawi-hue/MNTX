-- Mentorship certification test: a multiple-choice quiz + a 3-week virtual
-- (paper) trading challenge on live OANDA prices. Passing both (quiz >= 75%,
-- trading P/L >= 5%) auto-generates a certificate from an admin-uploaded
-- template image with the client's name/date overlaid.

CREATE TABLE IF NOT EXISTS public.cert_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cert_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trading' CHECK (status IN ('trading', 'graded_passed', 'graded_failed')),
  starting_balance NUMERIC NOT NULL DEFAULT 10000,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ,
  trading_pnl_percent NUMERIC,
  quiz_score_percent NUMERIC,
  quiz_answers JSONB,
  passed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_test_attempts_email ON public.cert_test_attempts(client_email);

CREATE TABLE IF NOT EXISTS public.cert_virtual_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.cert_test_attempts(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  units NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  pnl NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_cert_virtual_trades_attempt ON public.cert_virtual_trades(attempt_id);

CREATE TABLE IF NOT EXISTS public.cert_certificate_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  template_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  name_x_pct NUMERIC NOT NULL DEFAULT 50,
  name_y_pct NUMERIC NOT NULL DEFAULT 55,
  date_x_pct NUMERIC NOT NULL DEFAULT 50,
  date_y_pct NUMERIC NOT NULL DEFAULT 65,
  font_size INTEGER NOT NULL DEFAULT 36,
  font_color TEXT NOT NULL DEFAULT '#1a1a1a',
  font_family TEXT NOT NULL DEFAULT 'Georgia, serif',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cert_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cert_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cert_virtual_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cert_certificate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.cert_quiz_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.cert_test_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.cert_virtual_trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.cert_certificate_settings FOR ALL USING (true) WITH CHECK (true);
