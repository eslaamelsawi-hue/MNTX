import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PLAN_PRICES } from "@/lib/plan-pricing"
import { getPlanAmount, getMentorshipSplitForCoupon } from "@/lib/mentorship-pricing"
import { applyCouponDiscount } from "@/lib/coupon-pricing"
import { createPrivateUploadTicket } from "@/lib/storage"
import { getUsdToEgpRate } from "@/lib/egp-rate"
import { usdToEgp } from "@/lib/egp"
import { sendInstapayReceivedEmail } from "@/lib/instapay-orders"
import { sendNotificationEmail } from "@/lib/email"

export const runtime = "nodejs"

/** Proof of transfer is a phone screenshot or a bank PDF — nothing else. */
const PROOF_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
}

/**
 * Opens a manual Egyptian payment: records what the customer owes and hands
 * back a signed URL their browser uploads the proof of transfer to.
 *
 * The amount is recomputed here from the plan, the coupon and the split
 * option — exactly as the card and crypto routes do — so the browser can
 * never dictate the price. Nothing is granted by this route: the order starts
 * as awaiting_payment and only an admin who has seen the proof can approve it.
 */
export async function POST(request: Request) {
  try {
    const { plan, email, telegram, couponCode, splitPayment, preferredDate, preferredSlotId, filename } =
      await request.json()

    const planInfo = PLAN_PRICES[plan]
    if (!planInfo) return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const ext = String(filename ?? "").split(".").pop()?.toLowerCase() ?? ""
    const contentType = PROOF_TYPES[ext]
    if (!contentType) {
      return NextResponse.json(
        { error: "Upload a screenshot (PNG, JPG, WEBP, HEIC) or a PDF receipt." },
        { status: 400 }
      )
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
    const chargeAmount = isSplit
      ? customSplit
        ? customSplit.firstAmount
        : Math.round(finalAmount * 0.6 * 100) / 100
      : finalAmount

    const { rate } = await getUsdToEgpRate()
    const amountEgp = usdToEgp(chargeAmount, rate)

    const orderId = `instapay-${plan}-${Date.now()}`
    const proofKey = `payment-proofs/${orderId}.${ext}`

    const admin = createAdminClient()
    const { error: orderError } = await admin.from("instapay_orders").insert({
      order_id: orderId,
      plan,
      email: email.toLowerCase().trim(),
      telegram_username:
        typeof telegram === "string" && telegram.trim() ? telegram.trim().replace(/^@/, "") : null,
      full_amount: finalAmount,
      charge_amount: chargeAmount,
      amount_egp: amountEgp,
      usd_to_egp: rate,
      split_payment: isSplit,
      coupon_code: typeof couponCode === "string" && couponCode.trim() ? couponCode.trim().toUpperCase() : null,
      preferred_date: typeof preferredDate === "string" && preferredDate.trim() ? preferredDate.trim() : null,
      preferred_slot_id:
        typeof preferredSlotId === "string" && preferredSlotId.trim() ? preferredSlotId.trim() : null,
      proof_key: proofKey,
      status: "awaiting_payment",
    })
    if (orderError) {
      console.error("[instapay] Failed to record order:", orderError)
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 })
    }

    const ticket = await createPrivateUploadTicket(proofKey)
    return NextResponse.json({
      orderId,
      amountEgp,
      amountUsd: chargeAmount,
      contentType,
      signedUrl: ticket.signedUrl,
    })
  } catch (error) {
    console.error("[instapay] create failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Called once the browser has finished uploading the proof: moves the order
 * into the admin's verification queue. Still grants nothing.
 */
export async function PATCH(request: Request) {
  try {
    const { orderId, senderName, senderNumber } = await request.json()
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    // Conditional on the current status, so a replayed call can't drag an
    // order an admin has already decided on back into the queue.
    const { data: updated, error } = await admin
      .from("instapay_orders")
      .update({
        status: "pending_verification",
        submitted_at: new Date().toISOString(),
        sender_name: typeof senderName === "string" && senderName.trim() ? senderName.trim().slice(0, 120) : null,
        sender_number:
          typeof senderNumber === "string" && senderNumber.trim() ? senderNumber.trim().slice(0, 40) : null,
      })
      .eq("order_id", orderId)
      .eq("status", "awaiting_payment")
      .select("email, amount_egp")
      .maybeSingle()

    if (error) {
      console.error("[instapay] Failed to submit proof:", error)
      return NextResponse.json({ error: "Could not submit your proof. Please try again." }, { status: 500 })
    }
    if (!updated) {
      // Either unknown or already submitted — both are fine from the
      // customer's side, and neither should look like a failure.
      return NextResponse.json({ success: true, alreadySubmitted: true })
    }

    await sendInstapayReceivedEmail({
      email: updated.email,
      orderId,
      amountEgp: Number(updated.amount_egp),
    }).catch((e) => console.error("[instapay] receipt email failed:", e))

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      await sendNotificationEmail({
        to: adminEmail,
        title: "New Instapay payment to verify",
        message: `${updated.email} uploaded proof of transfer for order ${orderId}. Review it under Orders in the admin dashboard.`,
      }).catch((e) => console.error("[instapay] admin alert failed:", e))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[instapay] submit failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
