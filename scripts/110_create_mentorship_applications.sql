-- Applications submitted through the "/apply" 1-on-1 Coaching application
-- funnel (terms -> personal info -> trading experience -> mindset -> budget).
-- Reviewed by the admin, who can approve straight into a 40%-off coupon via
-- the existing Discount Offers tool (discount_offers / coupons tables).
CREATE TABLE IF NOT EXISTS public.mentorship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Personal details
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  age INTEGER,
  telegram_username TEXT NOT NULL,
  instagram TEXT,
  country TEXT NOT NULL,

  -- Trading experience
  current_job TEXT,
  hours_per_day TEXT,
  taught_by TEXT,
  market_experience TEXT,       -- 'real' | 'demo' | 'none'
  learning_duration TEXT,       -- '<6m' | '6m-1y' | '1y-2y' | '2y+'
  tried_funded_account BOOLEAN,
  passed_funded_account BOOLEAN,
  past_losses TEXT,

  -- Mindset & commitment
  why_join TEXT,
  top_mistakes TEXT,
  loss_reason_opinion TEXT,
  three_losses_reaction TEXT,
  can_attend_live BOOLEAN,
  can_dedicate_weekly_time BOOLEAN,
  commitment_rating SMALLINT CHECK (commitment_rating BETWEEN 1 AND 10),
  what_differentiates TEXT,
  paid_courses_before TEXT,

  -- Investment
  investment_range TEXT,        -- '<100' | '100-500' | '500-1000' | '1000+'
  investment_reason TEXT,

  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'rejected')),
  admin_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_applications_status ON public.mentorship_applications(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_applications_created_at ON public.mentorship_applications(created_at DESC);

ALTER TABLE public.mentorship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.mentorship_applications
  FOR ALL USING (true) WITH CHECK (true);
