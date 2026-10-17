import { NextResponse } from "next/server"
import { settleWhopOrderIfPaid } from "@/lib/whop-fulfillment"

/**
 * Checks one card order against Whop and fulfils it if the payment went
 * through. Called from the post-checkout success page, so a buyer who
 * actually paid is served even when Whop's webhook never reaches us.
 *
 * Safe to call publicly: it only ever moves an order the buyer already paid
 * for from pending to paid, and Whop is the source of truth.
 */
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const result = await settleWhopOrderIfPaid(orderId, new URL(request.url).origin)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[whop-verify] error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
