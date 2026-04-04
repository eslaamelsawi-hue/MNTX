import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { grantExtendHours, EXTEND_PLAN_HOURS } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { Resend } from "resend"

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

    // Extract planId from order_id format: "{planId}-{timestamp}"
    const planId = (order_id as string).replace(/-\d+$/, "")

    const isExtendPlan = !!EXTEND_PLAN_HOURS[planId]
    const isStarterPlan = planId === "starter"

    if (!isExtendPlan && !isStarterPlan) {
      // Not a handled plan — nothing to do
      return NextResponse.json({ ok: true })
    }

    let email: string = typeof payer_email === "string" ? payer_email.trim() : ""
    let name: string | undefined

    // Fallback: look up email from extend_requests table
    if (!email) {
      const supabase = createAdminClient()
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

    if (isExtendPlan) {
      await grantExtendHours(email, planId, name)
    }

    if (isStarterPlan) {
      const tgInviteLink = await createStarterInviteLink(`Starter-NP-${String(order_id).slice(-6)}`)
      if (tgInviteLink) {
        const apiKey = process.env.RESEND_API_KEY
        if (apiKey) {
          const resend = new Resend(apiKey)
          const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>"
          const planLabel = "Starter"
          await resend.emails.send({
            from,
            to: email,
            subject: "Payment Confirmed — Your Telegram Access",
            html: `
              <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
                <h1 style="color:#d4a017;font-size:24px;margin-bottom:8px">Payment Confirmed ✓</h1>
                <p style="color:#ccc;margin-bottom:24px">Thank you for purchasing the ${planLabel} Plan. Your payment has been received.</p>
                <div style="background:#0d2137;border:1px solid #1d6fa4;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
                  <p style="margin:0 0 8px;font-size:16px;font-weight:bold;color:#f5f5f5">🎉 Your Telegram Access</p>
                  <p style="margin:0 0 12px;color:#ccc;font-size:13px">Click the button below to join the private Starter Plan Telegram group. This link can only be used once.</p>
                  <a href="${tgInviteLink}" style="display:inline-block;background:#229ED9;color:#fff;font-weight:bold;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px">Join Telegram Group</a>
                </div>
                <hr style="border:none;border-top:1px solid #333;margin:24px 0"/>
                <p style="color:#666;font-size:12px;margin:0">© ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
              </div>
            `,
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("NowPayments webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
