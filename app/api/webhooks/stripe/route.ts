import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { sendConfirmationEmail } from "@/lib/email"

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecret) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY not set")
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
  }

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const stripeClient = new Stripe(stripeSecret)

  const body = await request.text()
  const sig = request.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event

  try {
    event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // Only handle starter plan payments
  const lineItems = await stripeClient.checkout.sessions.listLineItems(session.id, { limit: 1 })
  const productName = lineItems.data[0]?.description ?? ""
  const isStarterPlan =
    productName.toLowerCase().includes("smc") ||
    productName.toLowerCase().includes("starter") ||
    productName.toLowerCase().includes("advanced")

  if (!isStarterPlan) {
    return NextResponse.json({ received: true })
  }

  const email = session.customer_details?.email
  if (!email) {
    console.warn("[stripe-webhook] No customer email in session", session.id)
    return NextResponse.json({ received: true })
  }

  try {
    const tgInviteLink = await createStarterInviteLink(`Starter-Stripe-${session.id.slice(-6)}`)

    const amountFormatted = session.amount_total
      ? `$${(session.amount_total / 100).toFixed(2)}`
      : undefined

    await sendConfirmationEmail({
      to: email,
      planLabel: "Advanced SMC Course",
      amount: amountFormatted,
      orderId: session.id,
      tgInviteLink,
    })
  } catch (err) {
    console.error("[stripe-webhook] Post-payment actions failed:", err)
  }

  return NextResponse.json({ received: true })
}
