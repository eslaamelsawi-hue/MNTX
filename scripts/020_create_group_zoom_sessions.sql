-- Group Zoom Sessions table
CREATE TABLE IF NOT EXISTS group_zoom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_participants INTEGER,
  zoom_meeting_id TEXT,
  zoom_join_url TEXT,
  zoom_start_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Group Session Registrations table (who's attending)
CREATE TABLE IF NOT EXISTS group_session_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES group_zoom_sessions(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  attended BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_group_sessions_date ON group_zoom_sessions(session_date);
CREATE INDEX idx_registrations_session ON group_session_registrations(session_id);
CREATE INDEX idx_registrations_email ON group_session_registrations(client_email);

-- Enable RLS
ALTER TABLE group_zoom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_session_registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view group sessions" ON group_zoom_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can register for sessions" ON group_session_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view registrations" ON group_session_registrations FOR SELECT USING (true);
