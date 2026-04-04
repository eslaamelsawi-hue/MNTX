-- Add timezone fields to bookings table to track client timezone information

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS client_timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_timezone_offset VARCHAR(10);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_timezone ON bookings(client_timezone);

-- Add comment for documentation
COMMENT ON COLUMN bookings.client_timezone IS 'Client timezone name (e.g., America/New_York, Europe/London)';
COMMENT ON COLUMN bookings.client_timezone_offset IS 'Client timezone offset from UTC (e.g., UTC+2, UTC-5)';
