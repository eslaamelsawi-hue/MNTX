-- Allow deleting bookings (needed for admin to remove cancelled sessions)
CREATE POLICY "Anyone can delete bookings" ON public.bookings
  FOR DELETE USING (true);
