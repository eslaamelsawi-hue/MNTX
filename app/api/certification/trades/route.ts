import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOandaPrices, TRADABLE_INSTRUMENTS } from "@/lib/oanda"

/** Opens a new virtual position at the current live OANDA price. */
export async function POST(request: NextRequest) {
  const { instrument, side, units } = await request.json().catch(() => ({}))

  if (!instrument || !TRADABLE_INSTRUMENTS[instrument]) {
    return NextResponse.json({ error: "Invalid instrument" }, { status: 400 })
  }
  if (side !== "buy" && side !== "sell") {
    return NextResponse.json({ error: "side must be 'buy' or 'sell'" }, { status: 400 })
  }
  const unitsNum = Number(units)
  if (!unitsNum || unitsNum <= 0) {
    return NextResponse.json({ error: "units must be a positive number" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = user.email.toLowerCase().trim()

  const admin = createAdminClient()
  const { data: attempt } = await admin
    .from("cert_test_attempts")
    .select("*")
    .eq("client_email", email)
    .eq("status", "trading")
    .limit(1)
    .maybeSingle()

  if (!attempt) return NextResponse.json({ error: "No test in progress" }, { status: 404 })
  if (new Date(attempt.ends_at) < new Date()) {
    return NextResponse.json({ error: "Your 3-week trading window has ended. Close your open positions and finalize the test." }, { status: 400 })
  }

  let entryPrice: number
  try {
    const prices = await getOandaPrices([instrument])
    const p = prices[instrument]
    if (!p) return NextResponse.json({ error: "Price unavailable for this instrument right now" }, { status: 502 })
    entryPrice = side === "buy" ? p.ask : p.bid
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch price" }, { status: 502 })
  }

  const { data: trade, error } = await admin
    .from("cert_virtual_trades")
    .insert({ attempt_id: attempt.id, instrument, side, units: unitsNum, entry_price: entryPrice })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trade })
}
