import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPendingOrders, getOrder, updateOrder, deleteOrder } from "@/lib/okx-orders"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendConfirmationEmail } from "@/lib/email"
import { grantExtendHours, grantCoaching, parseConsultationHours } from "@/lib/grant-hours"
import { fulfillConsultation } from "@/lib/consultation"
import { sendConsultationEmails } from "@/lib/consultation-email"
import { createStarterInviteLink } from "@/lib/tg-invite"
import { markInstallmentPaid } from "@/lib/invoicing"
import { fulfillWhopOrder } from "@/lib/whop-fulfillment"
import { withVisaFee } from "@/lib/payment-fees"

async function getAllOrders() {
  const supabase = createAdminClient()

  const okx = await (async () => {
    try {
      const { data, error } = await supabase.from("okx_orders").select("*").order("created_at", { ascending: false })
      if (error || !data) return []
      const orderIds = data.map((d: Record<string, unknown>) => d.order_id as string)
      const { data: tokens } = await supabase.rpc("get_tg_tokens_for_orders", { order_ids: orderIds })
      const tokenMap = Object.fromEntries((tokens ?? []).map((t: { token: string; order_ref: string }) => [t.order_ref, t.token]))

      return data.map((d: Record<string, unknown>) => ({
        provider: "okx" as const,
        orderId: d.order_id,
        plan: d.plan,
        amount: d.amount,
        currency: "USDT",
        email: d.email,
        telegramUsername: d.telegram_username || undefined,
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
  })()

  const whop = await (async () => {
    try {
      const { data, error } = await supabase.from("whop_orders").select("*").order("created_at", { ascending: false })
      if (error || !data) return []
      return data.map((d: Record<string, unknown>) => ({
        provider: "whop" as const,
        orderId: d.order_id,
        plan: d.plan,
        // What the customer was actually charged, card fee included.
        amount: String(withVisaFee(Number(d.charge_amount))),
        currency: "USD",
        email: d.email,
        telegramUsername: d.telegram_username || undefined,
        status: d.status,
        createdAt: d.created_at,
        preferredDate: d.preferred_date || undefined,
      }))
    } catch {
      return []
    }
  })()

  return [...okx, ...whop].sort(
    (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
  )
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
  // Also return remaining token count for dashboard display
  let remainingTokens: number | null = null
  try {
    const supabase = createAdminClient()
    const { count } = await supabase
      .from("tg_access_tokens")
      .select("id", { count: "exact", head: true })
      .eq("used", false)
      .eq("plan", "starter")
    remainingTokens = count ?? 0
  } catch { /* non-fatal */ }
  return NextResponse.json({ orders, remainingTokens })
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orderId, action, provider } = await request.json()

  if (provider === "whop") {
    return handleWhopAction(request, orderId, action)
  }

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
      const { error: whopError } = await supabase.from("whop_orders").delete().eq("status", "paid")
      if (whopError) throw whopError
      return NextResponse.json({ success: true })
    } catch (e) {
      console.error("Failed to delete paid orders:", e)
      return NextResponse.json({ error: "Failed to delete paid orders" }, { status: 500 })
    }
  }

  // Delete a single order of ANY status (pending / paid / expired).
  if (action === "delete") {
    try {
      await deleteOrder(orderId)
      return NextResponse.json({ success: true })
    } catch (e) {
      console.error("Failed to delete order:", e)
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
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

    if (order.installmentId) {
      await markInstallmentPaid(order.installmentId)
      return NextResponse.json({ success: true })
    }

    const splitInfo = order.splitPayment && order.fullAmount
      ? { firstAmount: parseFloat(order.amount), secondAmount: Math.round((parseFloat(order.fullAmount) - parseFloat(order.amount)) * 100) / 100 }
      : undefined

    // Consultations book their session + Zoom meeting and send their own
    // email — the generic confirmation below doesn't apply to them.
    const markPaidConsultationHours = parseConsultationHours(order.plan)
    if (markPaidConsultationHours) {
      await fulfillConsultation({
        baseUrl: new URL(request.url).origin,
        email: order.email,
        hours: markPaidConsultationHours,
        amount: parseFloat(order.amount),
        orderId,
        preferredStart: order.preferredDate,
        preferredSlotId: order.preferredSlotId,
      })
      return NextResponse.json({ success: true })
    }

    // Grant hours if this is an extend plan
    await grantExtendHours(order.email, order.plan, undefined, parseFloat(order.amount), splitInfo)

    // Claim a TG token and send confirmation email for starter / coaching plan
    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")
    let tgInviteLink: string | null = null
    if (order.plan === "starter") {
      tgInviteLink = await createStarterInviteLink(orderId)
    } else if (order.plan === "coaching") {
      // Grant 10 hours + academy access + a Telegram course link.
      const res = await grantCoaching(order.email, orderId, undefined, parseFloat(order.amount), splitInfo)
      tgInviteLink = res.tgInviteLink
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

    const resendConsultationHours = parseConsultationHours(order.plan)
    if (resendConsultationHours) {
      const supabase = createAdminClient()
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("zoom_join_url")
        .ilike("client_message", `%(order ${orderId})%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      await sendConsultationEmails({
        email: order.email,
        hours: resendConsultationHours,
        amount: parseFloat(order.amount),
        orderId,
        preferredDate: order.preferredDate ? order.preferredDate.replace("T", " ").slice(0, 16) : undefined,
        zoomJoinUrl: existingBooking?.zoom_join_url ?? null,
      })
      return NextResponse.json({ success: true })
    }

    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")
    let tgInviteLink: string | null = null
    if (order.plan === "starter") {
      const botUsername = process.env.TG_BOT_USERNAME
      console.log(`[resend_email] orderId=${orderId} TG_BOT_USERNAME=${botUsername ? 'SET' : 'NOT SET'}`)
      const supabase = createAdminClient()
      const { data: tokenRows, error: rpcError } = await supabase.rpc("get_tg_tokens_for_orders", { order_ids: [orderId] })
      if (rpcError) console.error("[resend_email] get_tg_tokens_for_orders error:", rpcError)
      const existingToken = (tokenRows as Array<{ token: string; order_ref: string }> | null)?.[0]?.token
      console.log(`[resend_email] existingToken=${existingToken ? 'FOUND' : 'NOT FOUND'}`)
      if (existingToken && botUsername) {
        tgInviteLink = `https://t.me/${botUsername}?start=accesstoken_${existingToken}`
      } else {
        console.log(`[resend_email] claiming new token for orderId=${orderId}`)
        tgInviteLink = await createStarterInviteLink(orderId)
        console.log(`[resend_email] tgInviteLink=${tgInviteLink ? 'GOT URL' : 'NULL - pool empty or bot username missing'}`)
      }
      if (!tgInviteLink) {
        console.error(`[resend_email] No TG token for order ${orderId} — sending email without button`)
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

/** Card orders live in their own table and have no deposit address, tx id or
 *  "expired" state, so they get a smaller set of actions than OKX orders. */
async function handleWhopAction(request: Request, orderId: string, action: string) {
  const supabase = createAdminClient()
  const { data: order } = await supabase.from("whop_orders").select("*").eq("order_id", orderId).maybeSingle()
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  if (action === "delete") {
    const { error } = await supabase.from("whop_orders").delete().eq("order_id", orderId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "mark_paid") {
    if (order.status === "paid") {
      return NextResponse.json({ error: "This order is already paid" }, { status: 400 })
    }
    await supabase.from("whop_orders").update({ status: "paid" }).eq("order_id", orderId)

    if (order.installment_id) {
      await markInstallmentPaid(order.installment_id)
      return NextResponse.json({ success: true })
    }

    await fulfillWhopOrder(order, new URL(request.url).origin)
    return NextResponse.json({ success: true })
  }

  if (action === "resend_email") {
    if (order.status !== "paid") {
      return NextResponse.json({ error: "Can only resend email for paid orders" }, { status: 400 })
    }

    const consultationHours = parseConsultationHours(order.plan)
    if (consultationHours) {
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("zoom_join_url")
        .ilike("client_message", `%(order ${orderId})%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      await sendConsultationEmails({
        email: order.email,
        hours: consultationHours,
        amount: Number(order.full_amount),
        orderId,
        preferredDate: order.preferred_date ? String(order.preferred_date).replace("T", " ").slice(0, 16) : undefined,
        zoomJoinUrl: existingBooking?.zoom_join_url ?? null,
      })
      return NextResponse.json({ success: true })
    }

    const planLabel = order.plan.charAt(0).toUpperCase() + order.plan.slice(1).replace(/-/g, " ")
    await sendConfirmationEmail({
      to: order.email,
      planLabel,
      amount: `$${withVisaFee(Number(order.charge_amount))}`,
      orderId,
      tgInviteLink: null,
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unsupported action for card orders" }, { status: 400 })
}
