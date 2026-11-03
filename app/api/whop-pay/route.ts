import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createWhopCheckout, createWhopSplitCheckout } from "@/lib/whop"
import { PLAN_PRICES } from "@/lib/plan-pricing"
import { getPlanAmount, getMentorshipSplitForCoupon } from "@/lib/mentorship-pricing"
import { withVisaFee } from "@/lib/payment-fees"
import { applyCouponDiscount } from "@/lib/coupon-pricing"

export async function POST(request: Request) {
  try {
    const { plan, email, telegram, couponCode, locale, splitPayment, preferredDate, preferredSlotId } = await request.json()

    const planInfo = PLAN_PRICES[plan]
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    let finalAmount = (await getPlanAmount(plan)) ?? planInfo.amount
    if (couponCode && typeof couponCode === "string") {
      finalAmount = await applyCouponDiscount(couponCode, plan, finalAmount)
    }

    // An approved applicant may have a bespoke two-payment plan; everyone
    // else splitting falls back to the standard 60/40.
    const customSplit = couponCode && splitPayment ? await getMentorshipSplitForCoupon(String(couponCode)) : null
    if (customSplit) finalAmount = customSplit.firstAmount + customSplit.secondAmount

    const isSplit = !!splitPayment
    let chargeAmount = isSplit
      ? customSplit
        ? customSplit.firstAmount
        : Math.round(finalAmount * 0.6 * 100) / 100
      : finalAmount
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
      preferred_date: typeof preferredDate === "string" && preferredDate.trim() ? preferredDate.trim() : null,
      preferred_slot_id: typeof preferredSlotId === "string" && preferredSlotId.trim() ? preferredSlotId.trim() : null,
      status: "pending",
    })
    if (orderError) console.error("[whop-pay] Failed to record order:", orderError)

    // The customer pays the plan amount plus the card processing fee; the
    // order row keeps the fee-free amount so invoicing/splits stay correct.
    const metadata = { order_id: orderId, plan, email: email.toLowerCase().trim() }
    const secondAmount = Math.round((finalAmount - chargeAmount) * 100) / 100

    // Splitting on a card becomes a real Whop subscription: it charges the
    // same card again after 30 days and then stops, so there's no second
    // payment for the customer to remember.
    const checkout = isSplit && secondAmount > 0
      ? await createWhopSplitCheckout({
          planLabel: planInfo.description,
          firstAmount: withVisaFee(chargeAmount),
          secondAmount: withVisaFee(secondAmount),
          redirectUrl,
          metadata,
        })
      : await createWhopCheckout({
          planLabel: planInfo.description,
          amount: withVisaFee(chargeAmount),
          redirectUrl,
          metadata,
        })

    await admin.from("whop_orders").update({ checkout_id: checkout.checkoutId }).eq("order_id", orderId)

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    console.error("Whop pay error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
