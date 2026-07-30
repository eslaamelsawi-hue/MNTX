-- Private object storage for session recordings and course lesson videos.
-- Not public — the app only ever accesses it via the service-role admin
-- client (lib/storage.ts), which bypasses Storage RLS entirely, so no
-- storage.objects policies are required. Access control is enforced in the
-- API routes (auth + ownership check) before minting a short-lived signed URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-media', 'private-media', false)
ON CONFLICT (id) DO NOTHING;
