import "server-only"
import { grantExtendHours, grantCoaching, EXTEND_PLAN_HOURS, parseConsultationHours } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { sendConfirmationEmail, sendNotificationEmail } from "@/lib/email"
import { fulfillConsultation } from "@/lib/consultation"
import { formatEgp } from "@/lib/egp"

export type InstapayOrderRow = {
  order_id: string
  plan: string
  email: string
  full_amount: number
  charge_amount: number
  amount_egp: number
  split_payment?: boolean | null
  preferred_date?: string | null
  preferred_slot_id?: string | null
}

/**
 * Grants everything a verified Instapay order is owed and emails the buyer —
 * the manual-payment counterpart of fulfillWhopOrder, minus the card fee
 * (Instapay transfers carry none).
 *
 * Only ever called after an admin has looked at the proof of transfer: there
 * is no provider to confirm the money with, so verification is the human step
 * and this function is what that step triggers.
 */
export async function fulfillInstapayOrder(order: InstapayOrderRow, baseUrl: string): Promise<void> {
  const email = order.email
  const planId = order.plan

  const consultationHours = parseConsultationHours(planId)
  if (consultationHours) {
    await fulfillConsultation({
      baseUrl,
      email,
      hours: consultationHours,
      amount: order.full_amount,
      orderId: order.order_id,
      preferredStart: order.preferred_date,
      preferredSlotId: order.preferred_slot_id,
    })
    return
  }

  const splitInfo = order.split_payment
    ? {
        firstAmount: Number(order.charge_amount),
        secondAmount: Math.round((Number(order.full_amount) - Number(order.charge_amount)) * 100) / 100,
      }
    : undefined

  let tgInviteLink: string | null = null
  if (EXTEND_PLAN_HOURS[planId]) {
    await grantExtendHours(email, planId, undefined, order.full_amount, splitInfo)
  } else if (planId === "starter") {
    tgInviteLink = await createStarterInviteLink(order.order_id)
  } else if (planId === "coaching") {
    const res = await grantCoaching(email, order.order_id, undefined, order.full_amount, splitInfo)
    tgInviteLink = res.tgInviteLink
  }

  const planLabel = planId.charAt(0).toUpperCase() + planId.slice(1).replace(/-/g, " ")
  await sendConfirmationEmail({
    to: email,
    planLabel,
    amount: `${formatEgp(Number(order.amount_egp))} EGP ($${order.charge_amount})`,
    orderId: order.order_id,
    tgInviteLink,
  })
}

/** Tells the customer their transfer was rejected, with the admin's reason. */
export async function sendInstapayRejectionEmail(opts: {
  email: string
  orderId: string
  reason?: string | null
}): Promise<void> {
  const reason = opts.reason?.trim()
  await sendNotificationEmail({
    to: opts.email,
    title: "We couldn't verify your payment",
    message: [
      `We reviewed the transfer you sent for order ${opts.orderId} and weren't able to confirm it.`,
      reason ? `Reason: ${reason}` : null,
      "If you believe this is a mistake, reply to this email with the transaction receipt and we'll take another look.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  })
}

/** Confirms to the customer that their proof arrived and is being checked. */
export async function sendInstapayReceivedEmail(opts: {
  email: string
  orderId: string
  amountEgp: number
}): Promise<void> {
  await sendNotificationEmail({
    to: opts.email,
    title: "We received your payment proof",
    message: [
      `Thanks — we've received your proof of transfer for ${formatEgp(opts.amountEgp)} EGP (order ${opts.orderId}).`,
      "Our team verifies transfers manually, usually within a few hours. You'll get another email the moment your access is activated.",
    ].join("\n\n"),
  })
}
