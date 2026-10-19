import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PRODUCTS } from "@/lib/products"
import { getPlanAmount } from "@/lib/mentorship-pricing"

export async function POST(request: Request) {
  try {
    const { code, plan } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Coupon code is required" })
    }

    if (!plan || typeof plan !== "string") {
      return NextResponse.json({ valid: false, error: "Plan is required" })
    }

    const product = PRODUCTS.find((p) => p.id === plan)
    if (!product) {
      return NextResponse.json({ valid: false, error: "Invalid plan" })
    }

    // Honour an admin price override so the discount shown matches the charge.
    const configuredAmount = await getPlanAmount(plan)
    const priceInCents = configuredAmount !== undefined ? Math.round(configuredAmount * 100) : product.priceInCents

    const supabase = createAdminClient()

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" })
    }

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon has expired" })
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "This coupon has reached its maximum uses" })
    }

    // Check applicable plans
    if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
      if (!coupon.applicable_plans.includes(plan)) {
        return NextResponse.json({ valid: false, error: "This coupon is not valid for this plan" })
      }
    }

    // Check minimum order amount
    if (coupon.min_order_cents && priceInCents < coupon.min_order_cents) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount is $${(coupon.min_order_cents / 100).toFixed(2)}`,
      })
    }

    // Calculate discount
    let discountCents: number
    if (coupon.discount_type === "percent") {
      discountCents = Math.round(priceInCents * (coupon.discount_value / 100))
    } else {
      discountCents = Math.round(coupon.discount_value * 100)
    }

    discountCents = Math.min(discountCents, priceInCents)

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discountCents,
        priceInCents,
      },
    })
  } catch (error) {
    console.error("Coupon validation error:", error)
    return NextResponse.json({ valid: false, error: "Failed to validate coupon" })
  }
}