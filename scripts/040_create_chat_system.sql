-- Direct Messages (Mentor to Student only)
CREATE TABLE IF NOT EXISTS dm_conversations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  mentor_id TEXT NOT NULL,
  student_email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  conversation_id BIGINT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Group Session Chat
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Support Chat (Ticket System)
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all on dm_conversations" ON dm_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on dm_messages" ON dm_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on group_chat_messages" ON group_chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on support_tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on support_messages" ON support_messages FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dm_conversations_mentor ON dm_conversations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_student ON dm_conversations(student_email);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_session ON group_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(client_email);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
