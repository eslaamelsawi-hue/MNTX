import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { grantAccess } from "@/lib/course-access-store"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { COURSE_GRANT_PLAN } from "@/lib/course"

/** Mentorship hours granted by the 1-on-1 Coaching Plan (10 sessions = 10 hours). */
export const COACHING_HOURS = 10

// Hours granted per extend plan (1 session = 1 hour)
export const EXTEND_PLAN_HOURS: Record<string, number> = {
  "extend-1m": 2,
  "extend-2m": 4,
  "extend-3m": 10,
  "extend-6m": 20,
}

/**
 * Grants hours to a user when they purchase an extend bundle.
 * - If the user already has an active subscription: adds hours to total_hours.
 * - If no active subscription exists: creates a new one with the granted hours.
 */
export async function grantExtendHours(
  email: string,
  planId: string,
  name?: string
): Promise<void> {
  const hours = EXTEND_PLAN_HOURS[planId]
  if (!hours) return // not an extend plan

  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id, total_hours")
    .eq("client_email", normalizedEmail)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    await supabase
      .from("user_subscriptions")
      .update({
        total_hours: existing.total_hours + hours,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await supabase.from("user_subscriptions").insert({
      client_email: normalizedEmail,
      client_name: name || normalizedEmail.split("@")[0],
      plan: planId,
      total_hours: hours,
      used_hours: 0,
      status: "active",
    })
  }
}

/**
 * Only grants hours if the user has NO active subscription at all.
 * Safe to call on already-paid orders to avoid double-granting.
 */
export async function grantExtendHoursIfMissing(
  email: string,
  planId: string,
  name?: string
): Promise<void> {
  const hours = EXTEND_PLAN_HOURS[planId]
  if (!hours) return

  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("client_email", normalizedEmail)
    .eq("status", "active")
    .limit(1)
    .single()

  if (existing) return // already has a subscription, don't add again

  await supabase.from("user_subscriptions").insert({
    client_email: normalizedEmail,
    client_name: name || normalizedEmail.split("@")[0],
    plan: planId,
    total_hours: hours,
    used_hours: 0,
    status: "active",
  })
}

/**
 * Fulfills a confirmed 1-on-1 Coaching Plan purchase:
 *  1. grants 10 mentorship hours (adds to an active subscription, or creates one),
 *  2. grants on-site academy/course access,
 *  3. claims a Telegram course access link.
 * Idempotent per order (won't double-grant if the same orderRef fires twice).
 * Returns the Telegram invite link (or null) for the confirmation email.
 */
export async function grantCoaching(
  email: string,
  orderRef: string,
  name?: string,
): Promise<{ tgInviteLink: string | null; alreadyFulfilled: boolean }> {
  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id, total_hours, notes")
    .eq("client_email", normalizedEmail)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Already fulfilled this exact order — don't grant again or waste a TG token.
  if (existing?.notes && existing.notes.includes(orderRef)) {
    return { tgInviteLink: null, alreadyFulfilled: true }
  }

  // 1) 10 mentorship hours
  if (existing) {
    await supabase
      .from("user_subscriptions")
      .update({
        total_hours: existing.total_hours + COACHING_HOURS,
        notes: `${existing.notes ? existing.notes + " | " : ""}Coaching ${orderRef} (+${COACHING_HOURS}h)`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await supabase.from("user_subscriptions").insert({
      client_email: normalizedEmail,
      client_name: name || normalizedEmail.split("@")[0],
      plan: "coaching",
      total_hours: COACHING_HOURS,
      used_hours: 0,
      status: "active",
      notes: `Coaching ${orderRef} — 10 sessions (4 months)`,
    })
  }

  // 2) on-site academy / course access (idempotent upsert)
  try {
    await grantAccess(normalizedEmail, COURSE_GRANT_PLAN, "coaching-purchase", orderRef)
  } catch (e) {
    console.error("[grantCoaching] course access failed:", e)
  }

  // 3) Telegram course access link
  let tgInviteLink: string | null = null
  try {
    tgInviteLink = await createStarterInviteLink(orderRef)
  } catch (e) {
    console.error("[grantCoaching] telegram invite failed:", e)
  }

  return { tgInviteLink, alreadyFulfilled: false }
}
