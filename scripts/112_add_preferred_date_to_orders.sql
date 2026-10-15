-- Carries the client's preferred consultation date/time (chosen before
-- payment on the /consultation page) through to the confirmation/admin
-- alert emails sent on fulfillment. Free text (ISO date-time or a note for
-- "any date" requests over 3 hours) — scheduling itself stays manual.
ALTER TABLE public.okx_orders
  ADD COLUMN IF NOT EXISTS preferred_date TEXT;

ALTER TABLE public.whop_orders
  ADD COLUMN IF NOT EXISTS preferred_date TEXT;
