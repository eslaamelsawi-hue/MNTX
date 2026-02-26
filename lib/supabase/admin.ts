import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client using service_role key for privileged operations (storage, etc)
// Falls back to anon key if service_role is not set
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}