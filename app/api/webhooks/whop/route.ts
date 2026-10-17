import { NextResponse } from "next/server"
import crypto from "crypto"
import { settleWhopOrderIfPaid } from "@/lib/whop-fulfillment"

/** Whop signs "{webhook-id}.{webhook-timestamp}.{raw body}" with HMAC-SHA256
 *  and sends the result base64-encoded as "v1,<sig>" — possibly several,
 *  space-separated, while a secret is being rotated.
 *
 *  Whop's docs say the key is the secret exactly as issued ("ws_" included),
 *  but the Standard Webhooks convention it builds on decodes the part after
 *  the prefix. Rather than bet the endpoint on reading that right — a wrong
 *  guess rejects every delivery, and Whop disables an endpoint after enough
 *  failures — each plausible derivation of the SAME secret is tried, and the
 *  one that matched is logged so this can be narrowed down later. Every
 *  candidate still requires knowing the secret, so accepting any of them
 *  doesn't weaken verification. */
function secretKeyCandidates(secret: string): { label: string; key: Buffer }[] {
  const bare = secret.replace(/^whsec_|^ws_/, "")
  return [
    { label: "raw-with-prefix", key: Buffer.from(secret, "utf8") },
    { label: "raw-without-prefix", key: Buffer.from(bare, "utf8") },
    { label: "base64-decoded", key: Buffer.from(bare, "base64") },
    { label: "hex-decoded", key: Buffer.from(bare, "hex") },
  ]
}

function verifySignature(id: string, timestamp: string, rawBody: string, signatureHeader: string, secret: string): boolean {
  const signed = `${id}.${timestamp}.${rawBody}`
  const provided = signatureHeader.split(" ").filter(Boolean)

  for (const { label, key } of secretKeyCandidates(secret)) {
    const expectedFull = `v1,${crypto.createHmac("sha256", key).update(signed).digest("base64")}`
    const matched = provided.some((candidate) => {
      if (candidate.length !== expectedFull.length) return false
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedFull))
    })
    if (matched) {
      console.log(`[webhooks/whop] signature verified using "${label}" key derivation`)
      return true
    }
  }
  return false
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
        // Whop's test-event API returns this body verbatim, which is the only
        // window into a failing delivery from outside. Nothing secret is
        // exposed: header names, lengths, and short HMAC prefixes only — the
        // secret itself and full signatures stay out of it.
        const signed = `${id}.${timestamp}.${rawBody}`
        const diagnostic = {
          error: "Invalid signature",
          diagnostic: {
            receivedHeaders: [...request.headers.keys()].filter((h) => h.includes("webhook") || h.includes("whop")),
            secretPrefix: secret.slice(0, 3),
            secretLength: secret.length,
            timestampSkewSeconds: Math.round(Date.now() / 1000 - Number(timestamp)),
            bodyLength: rawBody.length,
            provided: signature.slice(0, 14),
            computed: Object.fromEntries(
              secretKeyCandidates(secret).map(({ label, key }) => [
                label,
                `v1,${crypto.createHmac("sha256", key).update(signed).digest("base64")}`.slice(0, 14),
              ])
            ),
          },
        }
        console.warn("[webhooks/whop] signature mismatch:", JSON.stringify(diagnostic.diagnostic))
        return NextResponse.json(diagnostic, { status: 401 })
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
