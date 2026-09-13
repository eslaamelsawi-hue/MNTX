-- Scopes a course_access grant to one specific course instead of always
-- being catalog-wide. course_id = '*' (the default, and what every existing
-- row gets backfilled to) means "all courses" — i.e. MNTX ELITE. A real
-- course id means "just this one course", used for per-course grants.
ALTER TABLE public.course_access ADD COLUMN IF NOT EXISTS course_id TEXT NOT NULL DEFAULT '*';

ALTER TABLE public.course_access DROP CONSTRAINT IF EXISTS course_access_email_plan_key;
ALTER TABLE public.course_access ADD CONSTRAINT course_access_email_plan_course_key UNIQUE (email, plan, course_id);

CREATE INDEX IF NOT EXISTS idx_course_access_course ON public.course_access(course_id);
