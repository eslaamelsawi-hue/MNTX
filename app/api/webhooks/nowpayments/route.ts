import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { grantExtendHours, grantCoaching, EXTEND_PLAN_HOURS } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { sendConfirmationEmail } from "@/lib/email"
import { markInstallmentPaid } from "@/lib/invoicing"

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
        return acc
      }, {} as Record<string, unknown>)
  }
  return obj
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const sorted = sortObjectKeys(JSON.parse(body))
  const expected = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(sorted))
    .digest("hex")
  return expected === signature
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-nowpayments-sig") || ""
    const secret = process.env.NOWPAYMENTS_IPN_SECRET

    if (secret && signature) {
      if (!verifySignature(body, signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    const { payment_status, order_id, payer_email } = data

    // Only act on confirmed/finished payments
    if (payment_status !== "finished" && payment_status !== "confirmed") {
      return NextResponse.json({ ok: true })
    }

    if (!order_id) {
      return NextResponse.json({ ok: true })
    }

    const supabase = createAdminClient()
    const { data: orderRow } = await supabase
      .from("nowpayments_orders")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle()

    // This order pays off an existing pending invoice installment (the
    // client dashboard's "Pay Now" flow) — no hours/access to (re-)grant.
    if (orderRow?.installment_id) {
      if (orderRow.status !== "paid") {
        await supabase.from("nowpayments_orders").update({ status: "paid" }).eq("order_id", order_id)
        await markInstallmentPaid(orderRow.installment_id)
      }
      return NextResponse.json({ ok: true })
    }

    // Extract planId from order_id format: "{planId}-{timestamp}" (fallback
    // for orders placed before the nowpayments_orders table existed).
    const planId = orderRow?.plan ?? (order_id as string).replace(/-\d+$/, "")

    const isExtendPlan = !!EXTEND_PLAN_HOURS[planId]
    const isStarterPlan = planId === "starter"
    const isCoachingPlan = planId === "coaching"

    if (!isExtendPlan && !isStarterPlan && !isCoachingPlan) {
      // Not a handled plan — nothing to do
      return NextResponse.json({ ok: true })
    }

    let email: string = typeof payer_email === "string" ? payer_email.trim() : ""
    let name: string | undefined
    if (!email && orderRow?.email) email = orderRow.email

    // Fallback: look up email from extend_requests table
    if (!email) {
      const { data: req } = await supabase
        .from("extend_requests")
        .select("email, name")
        .eq("order_id", order_id)
        .limit(1)
        .single()
      if (req?.email) {
        email = req.email
        name = req.name
      }
    }

    if (!email) {
      console.warn("NowPayments webhook: no email for order", order_id)
      return NextResponse.json({ ok: true })
    }

    // Avoid double-granting if the IPN fires more than once for the same order.
    if (orderRow && orderRow.status === "paid") {
      return NextResponse.json({ ok: true })
    }
    if (orderRow) {
      await supabase.from("nowpayments_orders").update({ status: "paid" }).eq("order_id", order_id)
    }

    // Use the actual (possibly coupon-discounted) amount on file when known,
    // and split the invoice into two installments if this was a split payment.
    const invoiceAmount = orderRow ? Number(orderRow.full_amount) : undefined
    const splitInfo = orderRow?.split_payment
      ? { firstAmount: Number(orderRow.charge_amount), secondAmount: Math.round((Number(orderRow.full_amount) - Number(orderRow.charge_amount)) * 100) / 100 }
      : undefined

    if (isExtendPlan) {
      await grantExtendHours(email, planId, name, invoiceAmount, splitInfo)
    }

    if (isStarterPlan) {
      const tgInviteLink = await createStarterInviteLink(`Starter-NP-${String(order_id).slice(-6)}`)
      await sendConfirmationEmail({
        to: email,
        planLabel: "Starter",
        orderId: String(order_id),
        tgInviteLink,
      })
    }

    if (isCoachingPlan) {
      // Grant 10 hours + academy access + a Telegram course link.
      const { tgInviteLink, alreadyFulfilled } = await grantCoaching(email, `Coaching-NP-${String(order_id).slice(-6)}`, name, invoiceAmount, splitInfo)
      if (!alreadyFulfilled) {
        await sendConfirmationEmail({
          to: email,
          planLabel: "1-on-1 Coaching Plan",
          orderId: String(order_id),
          tgInviteLink,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("NowPayments webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
