import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { grantExtendHours, EXTEND_PLAN_HOURS } from "@/lib/grant-hours"

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

    if (!EXTEND_PLAN_HOURS[planId]) {
      // Not an extend plan — nothing to do
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

    await grantExtendHours(email, planId, name)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("NowPayments webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
