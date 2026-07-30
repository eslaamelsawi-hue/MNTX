-- Course content store (courses -> sections -> lessons), a single JSON row
-- keyed by id="main". lib/course-store.ts reads/writes this; without it every
-- write (create/update/delete course, sections, lessons) silently fails over
-- to a local JSON file baked into the deployment, which is read-only on
-- serverless platforms (Vercel etc.) — so admin edits appear to succeed but
-- never actually persist, and the same stale course list keeps reappearing.
CREATE TABLE IF NOT EXISTS course_content (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on course_content"
  ON course_content FOR ALL
  USING (true) WITH CHECK (true);
