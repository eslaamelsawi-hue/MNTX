-- An approved applicant can be given a two-payment plan with amounts the
-- admin sets per person (the site's other split is a fixed 60/40). Stored
-- here rather than passed through the checkout URL, so the amounts can't be
-- edited by whoever holds the link.
ALTER TABLE public.mentorship_applications
  ADD COLUMN IF NOT EXISTS split_first_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS split_second_amount NUMERIC;
