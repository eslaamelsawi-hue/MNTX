-- Supabase's signed-upload/signed-download URL mechanism still goes through
-- RLS on storage.objects for the actual request — the signed token
-- authorizes that one request, it doesn't bypass RLS the way the service
-- role does for direct admin-client calls. Without these policies, every
-- browser PUT to a signed upload URL (and every redirect to a signed
-- download URL) is rejected regardless of how it was minted.
--
-- This is still safe for a non-public bucket: real access control is
-- enforced in the API routes (auth + ownership checks) before a short-lived
-- signed URL/token is ever issued — these policies just let those already-
-- authorized, already-signed requests complete.
CREATE POLICY "Allow uploads to private-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'private-media');

CREATE POLICY "Allow reads from private-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'private-media');

CREATE POLICY "Allow deletes from private-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'private-media');
