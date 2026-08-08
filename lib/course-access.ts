import "server-only"
import crypto from "crypto"
import { ACADEMY_ACCESS_PLANS } from "@/lib/course"
import { isGranted } from "@/lib/course-access-store"
import { createAdminClient } from "@/lib/supabase/admin"

export const COURSE_COOKIE = "course_access"
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

function secret(): string {
  return process.env.COURSE_ACCESS_SECRET || "dev-only-insecure-course-secret"
}

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

/** Sign `email.expiry` with HMAC so the streaming route can trust the cookie without a DB hit. */
export function signAccessToken(email: string): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${normalize(email)}.${exp}`
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${sig}`
}

/** Returns the email if the token is valid and unexpired, else null. */
export function verifyAccessToken(token: string | undefined): string | null {
  if (!token) return null
  const [payloadB64, sig] = token.split(".")
  if (!payloadB64 || !sig) return null
  let payload: string
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8")
  } catch {
    return null
  }
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const [email, expStr] = payload.split(".")
  if (!email || !expStr) return null
  if (Date.now() > Number(expStr)) return null
  return email
}

/**
 * Does this email own the course? Layered so it's testable locally:
 *  1) COURSE_ACCESS_EMAILS allowlist (manual / testing grants)
 *  2) an active mentorship/coaching subscription in user_subscriptions
 *  3) a paid order for the required plan in okx_orders
 * NowPayments / Stripe buyers can be added to the query later.
 *
 * This is the single source of truth for course entitlement — every route
 * that needs to know "can this email watch the course" (the access-check
 * the dashboard UI uses to show locked/unlocked, the subscribe endpoint,
 * the video stream route's cookie) must go through this function, not a
 * partial re-implementation, or they drift out of sync with each other.
 */
export async function hasCourseAccess(email: string): Promise<boolean> {
  const e = normalize(email)
  if (!e || !e.includes("@")) return false

  const allow = (process.env.COURSE_ACCESS_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (allow.includes(e)) return true

  // Admin-granted access (the MNTX ELITE list)
  if (await isGranted(e)) return true

  // Any active mentorship/coaching subscription unlocks the academy too.
  try {
    const admin = createAdminClient()
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("id")
      .ilike("client_email", e)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()
    if (sub) return true
  } catch {
    // DB unavailable — fall through
  }

  // A paid order for any plan that unlocks the course
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("okx_orders")
      .select("order_id")
      .in("plan", ACADEMY_ACCESS_PLANS)
      .eq("status", "paid")
      .ilike("email", e)
      .limit(1)
    if (data && data.length > 0) return true
  } catch {
    // DB unavailable — fall through to no access
  }
  return false
}
