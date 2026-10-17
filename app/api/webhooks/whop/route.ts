import { NextResponse } from "next/server"
import crypto from "crypto"
import { settleWhopOrderIfPaid } from "@/lib/whop-fulfillment"

/** Whop signs "{webhook-id}.{webhook-timestamp}.{raw body}" with HMAC-SHA256
 *  and sends the result base64-encoded as "v1,<sig>" — possibly several,
 *  space-separated, while a secret is being rotated.
 *
 *  The HMAC key is the secret exactly as issued, "ws_" prefix included: not
 *  stripped, not decoded. Confirmed against a live delivery. Getting this
 *  wrong rejects every delivery, and Whop disables an endpoint after enough
 *  consecutive failures. */
function verifySignature(id: string, timestamp: string, rawBody: string, signatureHeader: string, secret: string): boolean {
  const expectedFull = `v1,${crypto.createHmac("sha256", secret).update(`${id}.${timestamp}.${rawBody}`).digest("base64")}`

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
        console.warn("[webhooks/whop] signature mismatch — rejecting delivery")
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

    // Confirm the payment against Whop's API rather than trusting the posted
    // body, then settle. This keeps a forged (or unverified) request from
    // granting anything, and shares one idempotent path with the success-page
    // verify, the admin sync and the scheduled sweep.
    const result = await settleWhopOrderIfPaid(orderId, new URL(request.url).origin)
    if (result.status === "not_found") {
      console.warn("[webhooks/whop] no local order for", orderId)
    } else if (result.status === "pending") {
      console.warn("[webhooks/whop] Whop reports no completed payment for", orderId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhooks/whop] error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
