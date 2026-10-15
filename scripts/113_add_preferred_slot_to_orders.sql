-- The open availability slot a consultation buyer picked before paying (only
-- set for consultations of 3 hours or less, which must choose from the public
-- calendar). Longer consultations pick a free date/time and get a slot created
-- for them at fulfillment instead.
ALTER TABLE public.okx_orders
  ADD COLUMN IF NOT EXISTS preferred_slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL;

ALTER TABLE public.whop_orders
  ADD COLUMN IF NOT EXISTS preferred_slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL;
