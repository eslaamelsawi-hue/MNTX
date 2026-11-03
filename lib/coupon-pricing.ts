import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Applies a coupon to a plan price, server-side. Every checkout route resolves
 * the discount here rather than trusting an amount from the browser — the code
 * is all the client ever sends.
 *
 * An unknown, inactive, expired, used-up or plan-restricted code is not an
 * error: the full price comes back unchanged.
 */
export async function applyCouponDiscount(code: string, plan: string, amountDollars: number): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single()

    if (error || !coupon) return amountDollars
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return amountDollars
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return amountDollars
    if (coupon.applicable_plans?.length > 0 && !coupon.applicable_plans.includes(plan)) return amountDollars

    let discountDollars: number
    if (coupon.discount_type === "percent") {
      discountDollars = Math.round(amountDollars * (coupon.discount_value / 100) * 100) / 100
    } else {
      discountDollars = coupon.discount_value
    }
    return Math.max(0, Math.round((amountDollars - discountDollars) * 100) / 100)
  } catch {
    return amountDollars
  }
}
