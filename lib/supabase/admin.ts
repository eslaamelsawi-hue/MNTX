import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client using service_role key for privileged operations (storage, etc).
// Falls back to the anon key if service_role isn't set so local dev doesn't
// hard-crash without it — but the anon key does NOT bypass RLS, so every
// "admin" read/write silently becomes subject to RLS policies in that case.
// This has bitten us in production before (missing bucket policies etc.), so
// it's logged loudly rather than failing silently.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error(
      "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key. " +
        "Admin operations will be subject to RLS and may fail unexpectedly. Set this in your environment variables.",
    );
  }
  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}