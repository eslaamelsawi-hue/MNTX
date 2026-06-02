-- Seed the default weekly booking limit into admin_settings.
INSERT INTO admin_settings (key, value)
VALUES ('weekly_booking_limit', '2')
ON CONFLICT (key) DO NOTHING;

-- Update the trigger function to read the limit from admin_settings
-- so changes made in the admin dashboard take effect immediately at the DB level.
CREATE OR REPLACE FUNCTION check_weekly_booking_limit()
RETURNS TRIGGER AS $$
DECLARE
  slot_date_val DATE;
  week_start    DATE;
  week_end      DATE;
  booking_count INTEGER;
  weekly_limit  INTEGER := 2;
BEGIN
  IF NEW.status NOT IN ('confirmed', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT date INTO slot_date_val
  FROM availability_slots
  WHERE id = NEW.slot_id;

  IF slot_date_val IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read the limit dynamically from admin_settings; fall back to 2.
  SELECT COALESCE(value::INTEGER, 2) INTO weekly_limit
  FROM admin_settings
  WHERE key = 'weekly_booking_limit';

  week_start := date_trunc('week', slot_date_val)::DATE;
  week_end   := week_start + 6;

  SELECT COUNT(*) INTO booking_count
  FROM bookings b
  JOIN availability_slots s ON s.id = b.slot_id
  WHERE b.client_email = NEW.client_email
    AND b.status IN ('confirmed', 'completed')
    AND s.date BETWEEN week_start AND week_end
    AND b.id IS DISTINCT FROM NEW.id;

  IF booking_count >= weekly_limit THEN
    RAISE EXCEPTION 'weeklyLimitReached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
