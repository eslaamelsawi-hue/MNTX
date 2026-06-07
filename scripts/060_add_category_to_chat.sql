-- Add category column to group_chat_messages table
ALTER TABLE group_chat_messages
ADD COLUMN category TEXT DEFAULT 'general';

-- Add index for category queries
CREATE INDEX IF NOT EXISTS idx_group_chat_category ON group_chat_messages(category);
