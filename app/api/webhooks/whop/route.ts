import { NextResponse } from "next/server"
import crypto from "crypto"
import { handleWhopPaymentSucceeded } from "@/lib/whop-fulfillment"

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

    // Renewal charges from a split-pay subscription arrive here too, so the
    // handler decides between first payment, renewal and redelivery.
    await handleWhopPaymentSucceeded({
      paymentId: event.data?.id,
      orderId: event.data?.metadata?.order_id,
      customerEmail: event.data?.customer_email ?? event.data?.user?.email,
      baseUrl: new URL(request.url).origin,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhooks/whop] error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
