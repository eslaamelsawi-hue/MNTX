-- Lets a booking sit as 'pending' — used for a client's custom date/time
-- request that an admin must approve or decline before it becomes a real
-- confirmed session.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'completed', 'rescheduled', 'pending'));
