import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

// Hours granted per extend plan (4 hours/month)
export const EXTEND_PLAN_HOURS: Record<string, number> = {
  "extend-1m": 4,
  "extend-2m": 8,
  "extend-3m": 12,
  "extend-6m": 24,
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
