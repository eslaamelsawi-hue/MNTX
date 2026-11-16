-- Two tables the app writes to were unreachable for it.
--
-- This project's app authenticates with the anon key (SUPABASE_SERVICE_ROLE_KEY
-- holds the anon key), so a policy restricted to service_role rejects
-- everything the app does, and a table with RLS on and no policy at all
-- rejects it too:
--
--   mentorship_enrollments  policy was TO service_role → approvals failed
--   extend_requests         RLS on, no policy          → leads silently lost
--                                                         since 2026-03-28
--
-- These policies match the rest of this project — unrestricted. That is not
-- where this should end up: once the app holds a real service-role key, every
-- policy here should be narrowed in one pass, these included.
DROP POLICY IF EXISTS "Service role full access" ON public.mentorship_enrollments;
CREATE POLICY "Service role full access" ON public.mentorship_enrollments
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.extend_requests;
CREATE POLICY "Service role full access" ON public.extend_requests
  FOR ALL USING (true) WITH CHECK (true);
