import { NextResponse } from "next/server"
import { createNowpaymentsInvoice } from "@/lib/nowpayments"
import { createAdminClient } from "@/lib/supabase/admin"
import { PLAN_PRICES as PLAN_INFO } from "@/lib/plan-pricing"

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
    const { plan, email, couponCode, locale, splitPayment } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const planInfo = PLAN_INFO[plan]
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    // Apply coupon discount if provided
    let finalAmount = planInfo.amount
    if (couponCode && typeof couponCode === "string") {
      finalAmount = await applyCouponDiscount(couponCode, plan, planInfo.amount)
    }

    const isSplit = !!splitPayment
    const chargeAmount = isSplit ? Math.round(finalAmount * 0.6 * 100) / 100 : finalAmount

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const orderId = `${plan}-${Date.now()}`

    const supabase = createAdminClient()
    const { error: orderError } = await supabase.from("nowpayments_orders").insert({
      order_id: orderId,
      plan,
      email,
      full_amount: finalAmount,
      charge_amount: chargeAmount,
      split_payment: isSplit,
      status: "pending",
    })
    if (orderError) console.error("[nowpayments] Failed to record order:", orderError)

    const invoice = await createNowpaymentsInvoice({
      email,
      customerEmail: email,
      amount: Math.round(chargeAmount * 1.005 * 100) / 100,
      description: planInfo.description,
      successUrl: `${baseUrl}/${locale || "en"}/payment/success?provider=nowpayments&plan=${plan}&order=${orderId}`,
      cancelUrl: `${baseUrl}/${locale || "en"}/#pricing`,
      orderId,
    })

    if (!invoice.invoice_url) {
      throw new Error("No payment URL returned from NowPayments")
    }

    return NextResponse.json({ url: invoice.invoice_url })
  } catch (error) {
    console.error("NowPayments error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    )
  }
}
