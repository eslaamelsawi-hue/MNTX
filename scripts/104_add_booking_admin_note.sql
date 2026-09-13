-- Optional note an admin can attach when declining a client's custom time
-- request, shown to the client in the decline email and kept on the booking
-- record for reference.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS admin_note TEXT;
