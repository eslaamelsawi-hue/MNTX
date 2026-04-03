import { NextResponse } from "next/server"
import crypto from "crypto"
import { getOrder, updateOrder } from "@/lib/okx-orders"
import { Resend } from "resend"
import { grantExtendHours } from "@/lib/grant-hours"

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

async function sendConfirmationEmail(email: string, plan: string, amount: string, orderId: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping confirmation email")
    return
  }

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>"
  const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com"

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1).replace(/-/g, " ")

  const html = `
    <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
      <h1 style="color:#d4a017;font-size:24px;margin-bottom:8px">Payment Confirmed ✓</h1>
      <p style="color:#ccc;margin-bottom:24px">Thank you for your purchase. Your payment has been received.</p>
      <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px"><span style="color:#888">Plan:</span> <strong style="color:#f5f5f5">${planLabel}</strong></p>
        <p style="margin:0 0 8px"><span style="color:#888">Amount Paid:</span> <strong style="color:#d4a017">${amount} USDT</strong></p>
        <p style="margin:0"><span style="color:#888">Order ID:</span> <span style="color:#f5f5f5;font-family:monospace">${orderId}</span></p>
      </div>
      <p style="color:#ccc">Our team will reach out to you shortly to provide access. If you have any questions, reply to this email.</p>
      <hr style="border:none;border-top:1px solid #333;margin:24px 0"/>
      <p style="color:#666;font-size:12px;margin:0">© ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
    </div>
  `

  await Promise.all([
    resend.emails.send({
      from,
      to: email,
      subject: `Payment Confirmed — ${planLabel} (${orderId})`,
      html,
    }),
    resend.emails.send({
      from,
      to: adminEmail,
      subject: `New OKX Payment: ${email} — ${planLabel} $${amount}`,
      html: `
        <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
          <h1 style="color:#d4a017;font-size:20px">New OKX Payment Received</h1>
          <p><strong>Customer:</strong> ${email}</p>
          <p><strong>Plan:</strong> ${planLabel}</p>
          <p><strong>Amount:</strong> ${amount} USDT</p>
          <p><strong>Order ID:</strong> <span style="font-family:monospace">${orderId}</span></p>
        </div>
      `,
    }),
  ])
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
      return NextResponse.json({ status: "paid", message: "Payment already confirmed." })
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

    // Send confirmation emails
    await sendConfirmationEmail(order.email, order.plan, order.amount, orderId)

    return NextResponse.json({
      status: "paid",
      message: "Payment confirmed! Check your email for next steps.",
    })
  } catch (error) {
    console.error("OKX verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
