import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOandaPrices, TRADABLE_INSTRUMENTS } from "@/lib/oanda"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const prices = await getOandaPrices(Object.keys(TRADABLE_INSTRUMENTS))
    return NextResponse.json({ prices, instruments: TRADABLE_INSTRUMENTS })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch prices" }, { status: 502 })
  }
}
