import "server-only"
import crypto from "crypto"
import { hasGrant } from "@/lib/course-access-store"
import { getCourseById } from "@/lib/course-store"
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
  // The payload is `email.expiry`, and an email address contains dots of its
  // own — splitting on every dot cut the address short at its domain (so
  // "a@gmail.com" verified as "a@gmail" and matched no grant) and read the
  // expiry as "com", which compares false and never expires. Split on the
  // last dot only, which is the one this format actually uses.
  const sep = payload.lastIndexOf(".")
  if (sep <= 0) return null
  const email = payload.slice(0, sep)
  const exp = Number(payload.slice(sep + 1))
  if (!email || !Number.isFinite(exp)) return null
  if (Date.now() > exp) return null
  return email
}

/**
 * Does this email own THIS SPECIFIC course? Layered so it's testable locally:
 *  1) COURSE_ACCESS_EMAILS allowlist (manual / testing grants) — every course
 *  2) an admin/system grant: either blanket (MNTX ELITE) or scoped to this
 *     exact course
 *  3) a paid order for one of the plans THIS course accepts (its
 *     `accessPlans`, e.g. the SMC course also accepts a "starter" purchase)
 *
 * Note there is deliberately NO "any active subscription unlocks everything"
 * check — only MNTX ELITE (a blanket grant) or a grant/purchase tied to this
 * specific course does.
 *
 * This is the single source of truth for course entitlement — every route
 * that needs to know "can this email watch THIS course" (the access-check
 * the dashboard UI uses to show locked/unlocked, the subscribe endpoint,
 * the video stream route) must go through this function, not a partial
 * re-implementation, or they drift out of sync with each other.
 */
export async function hasCourseAccess(email: string, courseId: string): Promise<boolean> {
  const e = normalize(email)
  if (!e || !e.includes("@") || !courseId) return false

  const allow = (process.env.COURSE_ACCESS_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (allow.includes(e)) return true

  // Admin/system grant — blanket (MNTX ELITE) or scoped to this course.
  if (await hasGrant(e, courseId)) return true

  // A paid order for a plan this specific course accepts.
  try {
    const course = await getCourseById(courseId)
    const acceptedPlans = course?.accessPlans ?? []
    if (acceptedPlans.length > 0) {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from("okx_orders")
        .select("order_id")
        .in("plan", acceptedPlans)
        .eq("status", "paid")
        .ilike("email", e)
        .limit(1)
      if (data && data.length > 0) return true
    }
  } catch {
    // DB unavailable — fall through to no access
  }
  return false
}
