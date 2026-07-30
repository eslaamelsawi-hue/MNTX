import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Private video storage (session recordings, course lesson videos), backed by
 * a non-public Supabase Storage bucket. Local disk doesn't work here — Vercel's
 * filesystem is read-only and ephemeral, so uploads must go to real object
 * storage. Only ever touched via the service-role admin client, so no bucket
 * RLS policies are needed (service role bypasses Storage RLS the same way it
 * bypasses table RLS); access control lives in the API routes instead, which
 * mint short-lived signed URLs after checking auth/ownership.
 */
export const PRIVATE_BUCKET = "private-media"

export async function uploadPrivateFile(key: string, bytes: Buffer, contentType?: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(key, bytes, {
    contentType,
    upsert: true,
  })
  if (error) throw error
}

/**
 * A one-time signed URL the browser can PUT the file bytes to directly,
 * bypassing our own server entirely. Required for anything beyond a few MB —
 * Vercel serverless functions hard-cap request bodies at ~4.5MB
 * (FUNCTION_PAYLOAD_TOO_LARGE), so routing video uploads through an API route
 * never works past that size regardless of what the route does with the bytes.
 */
export async function createPrivateUploadTicket(key: string): Promise<{ signedUrl: string; token: string } | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUploadUrl(key)
  if (error || !data) return null
  return { signedUrl: data.signedUrl, token: data.token }
}

/** Null if the object is missing or storage is unreachable. */
export async function getPrivateFileSignedUrl(key: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(key, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function deletePrivateFile(key: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.storage.from(PRIVATE_BUCKET).remove([key])
}
