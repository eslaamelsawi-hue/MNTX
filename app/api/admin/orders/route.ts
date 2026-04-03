import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPendingOrders, getOrder, updateOrder } from "@/lib/okx-orders"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import { grantExtendHours } from "@/lib/grant-hours"

async function getAllOrders() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("okx_orders")
      .select("*")
      .order("created_at", { ascending: false })
    if (error || !data) return []
    return data.map((d: Record<string, unknown>) => ({
      orderId: d.order_id,
      plan: d.plan,
      amount: d.amount,
      email: d.email,
      address: d.address,
      chain: d.chain,
      status: d.status,
      createdAt: d.created_at,
      paidAt: d.paid_at || undefined,
      txId: d.tx_id || undefined,
    }))
  } catch {
    return []
  }
}

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orders = await getAllOrders()
  return NextResponse.json({ orders })
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orderId, action } = await request.json()

  // Handle bulk action: expire all pending orders
  if (action === "expire_all_pending") {
    try {
      const pending = await getPendingOrders()
      for (const o of pending) {
        await updateOrder(o.orderId, { status: "expired" })
      }
      return NextResponse.json({ success: true, count: pending.length })
    } catch (e) {
      console.error("Failed to expire all pending:", e)
      return NextResponse.json({ error: "Failed to expire pending orders" }, { status: 500 })
    }
  }

  if (action === "delete_all_paid") {
    try {
      const supabase = createAdminClient()
      const { error } = await supabase.from("okx_orders").delete().eq("status", "paid")
      if (error) throw error
      return NextResponse.json({ success: true })
    } catch (e) {
      console.error("Failed to delete paid orders:", e)
      return NextResponse.json({ error: "Failed to delete paid orders" }, { status: 500 })
    }
  }

  const order = await getOrder(orderId)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  if (action === "mark_paid") {
    await updateOrder(orderId, {
      status: "paid",
      paidAt: new Date().toISOString(),
    })

    // Grant hours if this is an extend plan
    await grantExtendHours(order.email, order.plan)

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
    await updateOrder(orderId, { status: "expired" })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
