import "server-only"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export const ADMIN_SESSION_COOKIE = "admin_session"
export const ADMIN_VIEW_AS_COOKIE = "admin_view_as"
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000

/** The admin cookie is base64 of "admin:<issued>" or "mentor:<id>:<issued>". */
export function isAdminSession(token: string | undefined): boolean {
  if (!token) return false
  try {
    const parts = Buffer.from(token, "base64").toString("utf8").split(":")
    if (parts[0] !== "admin" && parts[0] !== "mentor") return false
    const issuedAt = Number(parts[parts.length - 1])
    return Number.isFinite(issuedAt) && Date.now() - issuedAt < ADMIN_SESSION_TTL_MS
  } catch {
    return false
  }
}

/**
 * Whose data this request should return.
 *
 * Normally the signed-in client. When an admin is viewing someone's dashboard
 * from the Users page, their own session is the one in the browser — so
 * without this every session-derived endpoint answers with the *admin's*
 * invoices, notifications and recordings while claiming to show the client's.
 *
 * Impersonation requires both cookies: the admin session proves who is asking,
 * and admin_view_as names the account being viewed.
 */
export async function getViewerEmail(): Promise<string | null> {
  const store = await cookies()
  const viewAs = store.get(ADMIN_VIEW_AS_COOKIE)?.value
  if (viewAs && isAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value)) {
    return viewAs.toLowerCase().trim()
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email?.toLowerCase().trim() ?? null
}
