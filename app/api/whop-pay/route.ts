import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhopCheckout } from "@/lib/whop"
import { PLAN_PRICES } from "@/lib/plan-pricing"

async function applyCouponDiscount(code: string, plan: string, amountDollars: number): Promise<number> {
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

export async function POST(request: Request) {
  try {
    const { plan, email, telegram, couponCode, locale, splitPayment } = await request.json()

    const planInfo = PLAN_PRICES[plan]
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    let finalAmount = planInfo.amount
    if (couponCode && typeof couponCode === "string") {
      finalAmount = await applyCouponDiscount(couponCode, plan, planInfo.amount)
    }

    const isSplit = !!splitPayment
    let chargeAmount = isSplit ? Math.round(finalAmount * 0.6 * 100) / 100 : finalAmount
    // Whop requires a non-zero charge.
    if (chargeAmount <= 0) chargeAmount = 0.5

    const orderId = `whop-${plan}-${Date.now()}`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mentixtrading.com"
    const redirectUrl = `${baseUrl}/${locale || "en"}/payment/success?plan=${plan}&provider=whop&order=${orderId}`

    const admin = createAdminClient()
    const { error: orderError } = await admin.from("whop_orders").insert({
      order_id: orderId,
      plan,
      email: email.toLowerCase().trim(),
      telegram_username: typeof telegram === "string" && telegram.trim() ? telegram.trim().replace(/^@/, "") : null,
      full_amount: finalAmount,
      charge_amount: chargeAmount,
      split_payment: isSplit,
      status: "pending",
    })
    if (orderError) console.error("[whop-pay] Failed to record order:", orderError)

    const checkout = await createWhopCheckout({
      planLabel: planInfo.description,
      amount: chargeAmount,
      redirectUrl,
      metadata: { order_id: orderId, plan, email: email.toLowerCase().trim() },
    })

    await admin.from("whop_orders").update({ checkout_id: checkout.checkoutId }).eq("order_id", orderId)

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    console.error("Whop pay error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
