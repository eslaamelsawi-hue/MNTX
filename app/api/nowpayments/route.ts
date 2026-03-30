import { NextResponse } from "next/server"
import { createNowpaymentsInvoice } from "@/lib/nowpayments"
import { createAdminClient } from "@/lib/supabase/admin"

const PLAN_INFO: Record<string, { amount: number; description: string }> = {
  test:        { amount: 1,    description: "Mentix Trading - Test Plan" },
  "gold-pro":  { amount: 100,  description: "Mentix Trading - Gold Pro Monthly Analysis" },
  starter:     { amount: 379,  description: "Mentix Trading - ADVANCED SMC Course" },
  coaching:    { amount: 1599, description: "Mentix Trading - 1-on-1 Coaching Plan" },
  "extend-1m": { amount: 199,  description: "Mentix Trading - Mentorship Extension 1 Month" },
  "extend-2m": { amount: 379,  description: "Mentix Trading - Mentorship Extension 2 Months" },
  "extend-3m": { amount: 699,  description: "Mentix Trading - Mentorship Extension 3 Months" },
  "extend-6m": { amount: 1499, description: "Mentix Trading - Mentorship Extension 6 Months" },
}

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
    const { plan, email, couponCode } = await request.json()

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const orderId = `${plan}-${Date.now()}`

    const invoice = await createNowpaymentsInvoice({
      email,
      amount: Math.round(finalAmount * 1.005 * 100) / 100,
      description: planInfo.description,
      successUrl: `${baseUrl}/payment/success?provider=nowpayments&plan=${plan}`,
      cancelUrl: `${baseUrl}/#pricing`,
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
