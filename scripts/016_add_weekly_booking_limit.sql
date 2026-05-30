-- Enforce max 2 confirmed/completed bookings per client per calendar week (Mon–Sun).
-- This trigger is the authoritative enforcement layer — the API check is a UX shortcut only.

CREATE OR REPLACE FUNCTION check_weekly_booking_limit()
RETURNS TRIGGER AS $$
DECLARE
  slot_date_val DATE;
  week_start    DATE;
  week_end      DATE;
  booking_count INTEGER;
BEGIN
  -- Only enforce when the booking is confirmed or completed.
  IF NEW.status NOT IN ('confirmed', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Resolve the slot date.
  SELECT date INTO slot_date_val
  FROM availability_slots
  WHERE id = NEW.slot_id;

  IF slot_date_val IS NULL THEN
    RETURN NEW;
  END IF;

  -- Monday of the slot's week.
  week_start := date_trunc('week', slot_date_val)::DATE;
  week_end   := week_start + 6;

  -- Count existing confirmed/completed sessions for this email in the same week,
  -- excluding the current row (handles UPDATE as well as INSERT).
  SELECT COUNT(*) INTO booking_count
  FROM bookings b
  JOIN availability_slots s ON s.id = b.slot_id
  WHERE b.client_email = NEW.client_email
    AND b.status IN ('confirmed', 'completed')
    AND s.date BETWEEN week_start AND week_end
    AND b.id IS DISTINCT FROM NEW.id;

  IF booking_count >= 2 THEN
    RAISE EXCEPTION 'weeklyLimitReached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_weekly_booking_limit ON bookings;
CREATE TRIGGER enforce_weekly_booking_limit
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_weekly_booking_limit();
