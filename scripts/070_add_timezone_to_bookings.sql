-- Add client_timezone column to bookings table
ALTER TABLE bookings
ADD COLUMN client_timezone TEXT DEFAULT 'UTC';

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_bookings_timezone ON bookings(client_timezone);
