import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("OK-SIGN") || ""
    const secretKey = process.env.OKX_SECRET_KEY || ""

    // Verify webhook signature
    const expectedSig = crypto
      .createHmac("sha256", secretKey)
      .update(body)
      .digest("base64")

    if (signature && signature !== expectedSig) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data = JSON.parse(body)
    const { orderId, status, amount, currency } = data

    // status: "COMPLETED" | "FAILED" | "EXPIRED"
    if (status === "COMPLETED") {
      console.log(`OKX Pay order completed: ${orderId}, amount: ${amount} ${currency}`)
      // TODO: grant access / send confirmation email here
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("OKX webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
