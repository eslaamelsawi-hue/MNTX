import "server-only"
import { grantExtendHours, grantCoaching, EXTEND_PLAN_HOURS, parseConsultationHours } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { sendConfirmationEmail } from "@/lib/email"
import { fulfillConsultation } from "@/lib/consultation"
import { withVisaFee } from "@/lib/payment-fees"
import { createAdminClient } from "@/lib/supabase/admin"
import { findWhopPayment } from "@/lib/whop"
import { markInstallmentPaid } from "@/lib/invoicing"

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

/**
 * Reconciles one pending card order against Whop. Used by the post-checkout
 * verify call, the admin "Sync with Whop" action and the nightly sweep, so a
 * missed webhook self-heals instead of needing a manual Mark Paid.
 *
 * Returns the resulting state; "pending" means Whop has no completed payment
 * for it (yet).
 */
export async function settleWhopOrderIfPaid(
  orderId: string,
  baseUrl: string
): Promise<{ status: "paid" | "pending" | "not_found"; alreadyPaid?: boolean }> {
  const admin = createAdminClient()
  const { data: order } = await admin.from("whop_orders").select("*").eq("order_id", orderId).maybeSingle()
  if (!order) return { status: "not_found" }
  if (order.status === "paid") return { status: "paid", alreadyPaid: true }

  const { paid } = await findWhopPayment({ orderId, checkoutId: order.checkout_id })
  if (!paid) return { status: "pending" }

  // Claim the order before fulfilling, so a webhook arriving at the same
  // moment can't grant everything twice.
  const { data: claimed } = await admin
    .from("whop_orders")
    .update({ status: "paid" })
    .eq("order_id", orderId)
    .eq("status", "pending")
    .select("order_id")
  if (!claimed || claimed.length === 0) return { status: "paid", alreadyPaid: true }

  if (order.installment_id) {
    await markInstallmentPaid(order.installment_id)
    return { status: "paid" }
  }

  await fulfillWhopOrder(order, baseUrl)
  return { status: "paid" }
}
