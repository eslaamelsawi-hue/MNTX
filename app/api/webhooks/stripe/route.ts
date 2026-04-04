import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { Resend } from "resend"

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature") ?? ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: import("stripe").Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as import("stripe").Stripe.Checkout.Session

  // Only handle starter plan payments
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
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

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && tgInviteLink) {
      const resend = new Resend(apiKey)
      const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>"
      const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com"
      const amountFormatted = session.amount_total
        ? `$${(session.amount_total / 100).toFixed(2)}`
        : ""

      await Promise.all([
        resend.emails.send({
          from,
          to: email,
          subject: "Payment Confirmed — Your Telegram Access",
          html: `
            <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
              <h1 style="color:#d4a017;font-size:24px;margin-bottom:8px">Payment Confirmed ✓</h1>
              <p style="color:#ccc;margin-bottom:24px">Thank you for purchasing the Starter Plan. Your payment has been received.</p>
              <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px">
                <p style="margin:0 0 8px"><span style="color:#888">Plan:</span> <strong style="color:#f5f5f5">Starter</strong></p>
                ${amountFormatted ? `<p style="margin:0 0 8px"><span style="color:#888">Amount Paid:</span> <strong style="color:#d4a017">${amountFormatted}</strong></p>` : ""}
                <p style="margin:0"><span style="color:#888">Reference:</span> <span style="color:#f5f5f5;font-family:monospace">${session.id}</span></p>
              </div>
              <div style="background:#0d2137;border:1px solid #1d6fa4;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
                <p style="margin:0 0 8px;font-size:16px;font-weight:bold;color:#f5f5f5">🎉 Your Telegram Access</p>
                <p style="margin:0 0 12px;color:#ccc;font-size:13px">Click the button below to join the private Starter Plan Telegram group. This link can only be used once.</p>
                <a href="${tgInviteLink}" style="display:inline-block;background:#229ED9;color:#fff;font-weight:bold;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px">Join Telegram Group</a>
              </div>
              <hr style="border:none;border-top:1px solid #333;margin:24px 0"/>
              <p style="color:#666;font-size:12px;margin:0">© ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
            </div>
          `,
        }),
        resend.emails.send({
          from,
          to: adminEmail,
          subject: `New Stripe Payment: ${email} — Starter ${amountFormatted}`,
          html: `
            <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
              <h1 style="color:#d4a017;font-size:20px">New Stripe Payment Received</h1>
              <p><strong>Customer:</strong> ${email}</p>
              <p><strong>Plan:</strong> Starter</p>
              <p><strong>Amount:</strong> ${amountFormatted}</p>
              <p><strong>Session:</strong> <span style="font-family:monospace">${session.id}</span></p>
              <p><strong>TG Invite:</strong> <a href="${tgInviteLink}" style="color:#229ED9">${tgInviteLink}</a></p>
            </div>
          `,
        }),
      ])
    }
  } catch (err) {
    // Log but don't fail — payment is already confirmed by Stripe
    console.error("[stripe-webhook] Post-payment actions failed:", err)
  }

  return NextResponse.json({ received: true })
}
