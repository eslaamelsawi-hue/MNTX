import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPendingOrders, getOrder, updateOrder } from "@/lib/okx-orders"
import fs from "fs"
import path from "path"
import { Resend } from "resend"

function getAllOrders() {
  try {
    const file = path.join(process.cwd(), "data", "okx-orders.json")
    if (!fs.existsSync(file)) return []
    return JSON.parse(fs.readFileSync(file, "utf-8"))
  } catch {
    return []
  }
}

async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === "authenticated"
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orders = getAllOrders()
  return NextResponse.json({ orders })
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orderId, action } = await request.json()

  const order = getOrder(orderId)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  if (action === "mark_paid") {
    updateOrder(orderId, {
      status: "paid",
      paidAt: new Date().toISOString(),
    })

    // Send confirmation email
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = new Resend(apiKey)
      const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>"
      const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")

      await resend.emails.send({
        from,
        to: order.email,
        subject: `Payment Confirmed — ${planLabel} (${orderId})`,
        html: `
          <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
            <h1 style="color:#d4a017;font-size:24px;margin-bottom:8px">Payment Confirmed ✓</h1>
            <p style="color:#ccc;margin-bottom:24px">Your payment has been manually confirmed by the Mentix team.</p>
            <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 8px"><span style="color:#888">Plan:</span> <strong style="color:#f5f5f5">${planLabel}</strong></p>
              <p style="margin:0 0 8px"><span style="color:#888">Amount:</span> <strong style="color:#d4a017">${order.amount} USDT</strong></p>
              <p style="margin:0"><span style="color:#888">Order ID:</span> <span style="color:#f5f5f5;font-family:monospace">${orderId}</span></p>
            </div>
            <p style="color:#ccc">Our team will reach out to you shortly to provide access.</p>
            <hr style="border:none;border-top:1px solid #333;margin:24px 0"/>
            <p style="color:#666;font-size:12px;margin:0">© ${new Date().getFullYear()} Mentix Trading</p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true })
  }

  if (action === "resend_email") {
    if (order.status !== "paid") {
      return NextResponse.json({ error: "Can only resend email for paid orders" }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>"
    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")

    await resend.emails.send({
      from,
      to: order.email,
      subject: `Payment Confirmed — ${planLabel} (${orderId})`,
      html: `
        <div style="background:#0a0a0a;color:#f5f5f5;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;border:1px solid #333">
          <h1 style="color:#d4a017;font-size:24px;margin-bottom:8px">Payment Confirmed ✓</h1>
          <p style="color:#ccc;margin-bottom:24px">This is a resent confirmation for your purchase.</p>
          <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 8px"><span style="color:#888">Plan:</span> <strong style="color:#f5f5f5">${planLabel}</strong></p>
            <p style="margin:0 0 8px"><span style="color:#888">Amount:</span> <strong style="color:#d4a017">${order.amount} USDT</strong></p>
            <p style="margin:0 0 8px"><span style="color:#888">Order ID:</span> <span style="color:#f5f5f5;font-family:monospace">${orderId}</span></p>
            ${order.txId ? `<p style="margin:0"><span style="color:#888">TX ID:</span> <span style="color:#f5f5f5;font-family:monospace">${order.txId}</span></p>` : ""}
          </div>
          <hr style="border:none;border-top:1px solid #333;margin:24px 0"/>
          <p style="color:#666;font-size:12px;margin:0">© ${new Date().getFullYear()} Mentix Trading</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  }

  if (action === "mark_expired") {
    updateOrder(orderId, { status: "expired" })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
