-- Admin/auto-granted course access list (the "MNTX ELITE" grant table).
-- lib/course-access-store.ts reads/writes this; without it every grantAccess()
-- call silently fails over to a local JSON file, which doesn't work on
-- serverless platforms with a read-only filesystem (Vercel etc.).
CREATE TABLE IF NOT EXISTS course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT,
  note TEXT,
  UNIQUE (email, plan)
);

CREATE INDEX idx_course_access_email ON course_access(email);

ALTER TABLE course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on course_access"
  ON course_access FOR ALL
  USING (true) WITH CHECK (true);
