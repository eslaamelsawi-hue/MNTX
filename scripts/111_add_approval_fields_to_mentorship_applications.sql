-- Tracks the outcome of reviewing a mentorship application: the single-use
-- $600 coupon + checkout link generated on approval, and the reason given
-- to the applicant on decline.
ALTER TABLE public.mentorship_applications
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;
