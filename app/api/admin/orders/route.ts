import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPendingOrders, getOrder, updateOrder } from "@/lib/okx-orders"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendConfirmationEmail } from "@/lib/email"
import { grantExtendHours } from "@/lib/grant-hours"
import { createStarterInviteLink } from "@/lib/tg-invite"

async function getAllOrders() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("okx_orders")
      .select("*")
      .order("created_at", { ascending: false })
    if (error || !data) return []
    const orderIds = data.map((d: Record<string, unknown>) => d.order_id as string)
    const { data: tokens } = await supabase.rpc("get_tg_tokens_for_orders", { order_ids: orderIds })
    const tokenMap = Object.fromEntries((tokens ?? []).map((t: { token: string; order_ref: string }) => [t.order_ref, t.token]))

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
      tgToken: tokenMap[d.order_id as string] || undefined,
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

    // Claim a TG token and send confirmation email for starter plan
    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")
    let tgInviteLink: string | null = null
    if (order.plan === "starter") {
      tgInviteLink = await createStarterInviteLink(orderId)
    }
    await sendConfirmationEmail({
      to: order.email,
      planLabel,
      amount: `${order.amount} USDT`,
      orderId,
      tgInviteLink,
    })

    return NextResponse.json({ success: true })
  }

  if (action === "resend_email") {
    if (order.status !== "paid") {
      return NextResponse.json({ error: "Can only resend email for paid orders" }, { status: 400 })
    }

    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")
    let tgInviteLink: string | null = null
    if (order.plan === "starter") {
      // Reuse the token already claimed for this order; only claim a new one if none exists
      const supabase = createAdminClient()
      const botUsername = process.env.TG_BOT_USERNAME
      const { data: tokenRow } = await supabase
        .from("tg_access_tokens")
        .select("token")
        .eq("order_ref", orderId)
        .limit(1)
        .maybeSingle()
      if (tokenRow?.token && botUsername) {
        tgInviteLink = `https://t.me/${botUsername}?start=accesstoken_${tokenRow.token}`
      } else {
        tgInviteLink = await createStarterInviteLink(orderId)
      }
    }
    await sendConfirmationEmail({
      to: order.email,
      planLabel,
      amount: `${order.amount} USDT`,
      orderId,
      tgInviteLink,
    })

    return NextResponse.json({ success: true })
  }

  if (action === "mark_expired") {
    await updateOrder(orderId, { status: "expired" })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
