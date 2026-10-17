import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { markInstallmentPaid } from "@/lib/invoicing"
import { fulfillWhopOrder } from "@/lib/whop-fulfillment"

/** Whop signs webhooks per the Standard Webhooks spec: HMAC-SHA256 over
 *  "{webhook-id}.{webhook-timestamp}.{raw body}", secret is base64 after a
 *  whsec_/ws_ prefix, header value is "v1,<base64 sig>" (possibly several,
 *  space-separated, during secret rotation). */
function verifySignature(id: string, timestamp: string, rawBody: string, signatureHeader: string, secret: string): boolean {
  const secretBytes = Buffer.from(secret.replace(/^whsec_|^ws_/, ""), "base64")
  const expected = crypto.createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest("base64")
  const expectedFull = `v1,${expected}`

  return signatureHeader.split(" ").some((candidate) => {
    if (candidate.length !== expectedFull.length) return false
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedFull))
  })
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const secret = process.env.WHOP_WEBHOOK_SECRET
    const id = request.headers.get("webhook-id") || ""
    const timestamp = request.headers.get("webhook-timestamp") || ""
    const signature = request.headers.get("webhook-signature") || ""

    if (secret) {
      if (!id || !timestamp || !signature) {
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 })
      }
      if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
        return NextResponse.json({ error: "Timestamp too old" }, { status: 401 })
      }
      if (!verifySignature(id, timestamp, rawBody, signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    } else {
      console.warn("[webhooks/whop] WHOP_WEBHOOK_SECRET not set — accepting unverified webhook")
    }

    const event = JSON.parse(rawBody)
    if (event.type !== "payment.succeeded") {
      return NextResponse.json({ ok: true })
    }

    const orderId: string | undefined = event.data?.metadata?.order_id
    if (!orderId) {
      console.warn("[webhooks/whop] payment.succeeded with no order_id in metadata")
      return NextResponse.json({ ok: true })
    }

    const admin = createAdminClient()
    const { data: order } = await admin.from("whop_orders").select("*").eq("order_id", orderId).maybeSingle()
    if (!order) {
      console.warn("[webhooks/whop] no local order for", orderId)
      return NextResponse.json({ ok: true })
    }
    if (order.status === "paid") {
      return NextResponse.json({ ok: true }) // already processed — webhooks can redeliver
    }

    // This order pays off an existing pending invoice installment (the
    // client dashboard's "Pay Now" flow) — no hours/access to (re-)grant.
    if (order.installment_id) {
      await admin.from("whop_orders").update({ status: "paid" }).eq("order_id", orderId)
      await markInstallmentPaid(order.installment_id)
      return NextResponse.json({ ok: true })
    }

    await admin.from("whop_orders").update({ status: "paid" }).eq("order_id", orderId)

    await fulfillWhopOrder(order, new URL(request.url).origin)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhooks/whop] error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
