import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOandaPrices } from "@/lib/oanda"

/** Closes an open virtual position at the current live OANDA price. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = user.email.toLowerCase().trim()

  const admin = createAdminClient()
  const { data: trade } = await admin
    .from("cert_virtual_trades")
    .select("*, cert_test_attempts!inner(client_email)")
    .eq("id", id)
    .single()

  if (!trade) return NextResponse.json({ error: "Trade not found" }, { status: 404 })
  const attemptEmail = Array.isArray(trade.cert_test_attempts) ? trade.cert_test_attempts[0]?.client_email : trade.cert_test_attempts?.client_email
  if (attemptEmail !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (trade.status !== "open") return NextResponse.json({ error: "This position is already closed" }, { status: 400 })

  let exitPrice: number
  try {
    const prices = await getOandaPrices([trade.instrument])
    const p = prices[trade.instrument]
    if (!p) return NextResponse.json({ error: "Price unavailable for this instrument right now" }, { status: 502 })
    exitPrice = trade.side === "buy" ? p.bid : p.ask
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch price" }, { status: 502 })
  }

  const pnl = trade.side === "buy" ? (exitPrice - trade.entry_price) * trade.units : (trade.entry_price - exitPrice) * trade.units

  const { data: updated, error } = await admin
    .from("cert_virtual_trades")
    .update({ exit_price: exitPrice, closed_at: new Date().toISOString(), pnl, status: "closed" })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trade: updated })
}
