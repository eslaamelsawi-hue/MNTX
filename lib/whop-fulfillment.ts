import "server-only"
import { grantExtendHours, grantCoaching, EXTEND_PLAN_HOURS, parseConsultationHours } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { sendConfirmationEmail } from "@/lib/email"
import { fulfillConsultation } from "@/lib/consultation"
import { withVisaFee } from "@/lib/payment-fees"

export type WhopOrderRow = {
  order_id: string
  plan: string
  email: string
  full_amount: number
  charge_amount: number
  split_payment?: boolean | null
  preferred_date?: string | null
  preferred_slot_id?: string | null
}

/**
 * Grants everything a paid Whop (card) order is owed and emails the buyer.
 * Shared by the payment.succeeded webhook and the admin "Mark Paid" action,
 * so a webhook that never arrives can be settled by hand without the two
 * paths drifting apart.
 *
 * Assumes the order has already been flipped to paid — it does not touch
 * order status, and installment payments are handled by the caller.
 */
export async function fulfillWhopOrder(order: WhopOrderRow, baseUrl: string): Promise<void> {
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
    amount: `$${withVisaFee(Number(order.charge_amount))}`,
    orderId: order.order_id,
    tgInviteLink,
  })
}
