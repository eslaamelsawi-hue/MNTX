import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  PLAN_PRICES,
  DEFAULT_MENTORSHIP_PRICE,
  DEFAULT_MENTORSHIP_DISCOUNT_PERCENT,
  discountedPrice,
} from "@/lib/plan-pricing"

export const MENTORSHIP_PRICE_KEY = "mentorship_price"
export const MENTORSHIP_DISCOUNT_KEY = "mentorship_discount_percent"

/** The mentorship plan is the coaching plan — admin overrides to its price
 *  apply to every checkout for it, not just the application funnel. */
export const MENTORSHIP_PLAN = "coaching"

export type MentorshipPricing = {
  price: number
  discountPercent: number
  discountedPrice: number
}

/**
 * Current mentorship list price and approved-applicant discount, as set in
 * the admin dashboard. Falls back to the defaults in plan-pricing when
 * nothing is configured or the stored value is unusable, so a bad row can
 * never take checkout down.
 */
export async function getMentorshipPricing(): Promise<MentorshipPricing> {
  let price = DEFAULT_MENTORSHIP_PRICE
  let discountPercent = DEFAULT_MENTORSHIP_DISCOUNT_PERCENT

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [MENTORSHIP_PRICE_KEY, MENTORSHIP_DISCOUNT_KEY])

    for (const row of data ?? []) {
      const value = Number(row.value)
      if (!Number.isFinite(value)) continue
      if (row.key === MENTORSHIP_PRICE_KEY && value > 0) price = value
      if (row.key === MENTORSHIP_DISCOUNT_KEY && value >= 0 && value <= 100) discountPercent = value
    }
  } catch (e) {
    console.error("[mentorship-pricing] falling back to defaults:", e)
  }

  return { price, discountPercent, discountedPrice: discountedPrice(price, discountPercent) }
}

/**
 * Price to charge for a plan, honouring the admin's mentorship override.
 * Every checkout route goes through this so the configured price is what the
 * customer is actually billed — otherwise the dashboard would show one number
 * and the card charge another.
 */
export async function getPlanAmount(plan: string): Promise<number | undefined> {
  if (plan === MENTORSHIP_PLAN) return (await getMentorshipPricing()).price
  return PLAN_PRICES[plan]?.amount
}

export type MentorshipSplitPlan = { firstAmount: number; secondAmount: number }

/**
 * The custom two-payment plan an admin attached to an approved applicant,
 * looked up by the single-use coupon in their checkout link.
 *
 * Deliberately read from the database rather than the URL: the first charge
 * is derived from this, so letting the link carry the amounts would let the
 * holder pay whatever they liked.
 */
export async function getMentorshipSplitForCoupon(code: string): Promise<MentorshipSplitPlan | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("mentorship_applications")
      .select("split_first_amount, split_second_amount")
      .eq("coupon_code", code.toUpperCase().trim())
      .maybeSingle()

    const first = Number(data?.split_first_amount)
    const second = Number(data?.split_second_amount)
    if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0 || second <= 0) return null
    return { firstAmount: first, secondAmount: second }
  } catch (e) {
    console.error("[mentorship-pricing] split lookup failed:", e)
    return null
  }
}
