-- Create mentors table
CREATE TABLE IF NOT EXISTS mentors (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Allow all on mentors" ON mentors FOR ALL USING (true) WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_mentors_email ON mentors(email);

-- Insert the mentor (make sure email doesn't already exist)
INSERT INTO mentors (email, password, name)
VALUES ('eslaamelsawi@gmail.com', '01000166336EsS!', 'Eslaam Elsawi')
ON CONFLICT (email) DO UPDATE SET password = '01000166336EsS!' , name = 'Eslaam Elsawi';
