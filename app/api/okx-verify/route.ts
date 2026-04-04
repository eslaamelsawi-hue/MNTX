import { NextResponse } from "next/server"
import crypto from "crypto"
import { getOrder, updateOrder } from "@/lib/okx-orders"
import { grantExtendHours, grantExtendHoursIfMissing } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { sendConfirmationEmail } from "@/lib/email"

const OKX_API_BASE = "https://www.okx.com"

function generateSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secretKey: string
): string {
  const prehash = `${timestamp}${method}${requestPath}${body}`
  return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64")
}

async function fetchOKXDeposits(accessKey: string, secretKey: string, passphrase: string) {
  const endpoint = "/api/v5/asset/deposit-history?ccy=USDT&limit=50"
  const timestamp = new Date().toISOString()
  const signature = generateSignature(timestamp, "GET", endpoint, "", secretKey)

  const response = await fetch(`${OKX_API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": accessKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
    },
  })

  const data = await response.json()
  return data
}



export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    const order = await getOrder(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status === "paid") {
      // Grant hours if not yet granted
      await grantExtendHoursIfMissing(order.email, order.plan)
      // Claim a new TG token to show in modal (no re-send email — customer already received theirs)
      let tgInviteLinkRetry: string | null = null
      if (order.plan === "starter") {
        tgInviteLinkRetry = await createStarterInviteLink(`Starter-OKX-${orderId.slice(-6)}-retry`)
      }
      return NextResponse.json({
        status: "paid",
        message: "Payment already confirmed.",
        ...(tgInviteLinkRetry ? { tgInviteLink: tgInviteLinkRetry } : {}),
      })
    }

    const accessKey = process.env.OKX_ACCESS_KEY
    const secretKey = process.env.OKX_SECRET_KEY
    const passphrase = process.env.OKX_PASSPHRASE || ""

    if (!accessKey || !secretKey) {
      return NextResponse.json({ error: "OKX not configured" }, { status: 500 })
    }

    const data = await fetchOKXDeposits(accessKey, secretKey, passphrase)

    if (data.code !== "0") {
      return NextResponse.json(
        { error: `OKX error: ${data.msg}` },
        { status: 400 }
      )
    }

    const orderCreatedAt = new Date(order.createdAt).getTime()
    const expectedAmount = parseFloat(order.amount)

    // Look for a USDT deposit matching the amount, received after the order was created
    const match = data.data?.find((deposit: {
      amt: string
      state: string
      ts: string
      txId: string
    }) => {
      const depositAmount = parseFloat(deposit.amt)
      const depositTime = parseInt(deposit.ts)
      const isCompleted = deposit.state === "2" // 2 = successful on OKX
      const isAfterOrder = depositTime >= orderCreatedAt - 60_000 // 1 min buffer
      const amountMatches = Math.abs(depositAmount - expectedAmount) < 0.01

      return isCompleted && isAfterOrder && amountMatches
    })

    if (!match) {
      return NextResponse.json({
        status: "pending",
        message: "Payment not found yet. Please wait a few minutes after sending and try again.",
      })
    }

    // Mark order as paid
    await updateOrder(orderId, {
      status: "paid",
      paidAt: new Date().toISOString(),
      txId: match.txId,
    })

    // Grant hours if this is an extend plan
    await grantExtendHours(order.email, order.plan)

    // Generate Telegram invite link for starter plan subscribers
    let tgInviteLink: string | null = null
    if (order.plan === "starter") {
      tgInviteLink = await createStarterInviteLink(`Starter-OKX-${orderId.slice(-6)}`)
    }

    // Send one confirmation email to the customer
    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")
    await sendConfirmationEmail({
      to: order.email,
      planLabel,
      amount: `${order.amount} USDT`,
      orderId,
      tgInviteLink,
    })

    return NextResponse.json({
      status: "paid",
      message: "Payment confirmed! Check your email for next steps.",
      ...(tgInviteLink ? { tgInviteLink } : {}),
    })
  } catch (error) {
    console.error("OKX verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
