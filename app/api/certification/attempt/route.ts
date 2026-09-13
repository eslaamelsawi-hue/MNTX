import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeEquity, isEligibleForCertTest } from "@/lib/certification"

/** Returns the client's most recent test attempt (if any), its trades, and
 *  live mark-to-market equity/P/L for any still-open positions. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = user.email.toLowerCase().trim()

  const admin = createAdminClient()
  const eligible = await isEligibleForCertTest(email)

  const { data: attempt } = await admin
    .from("cert_test_attempts")
    .select("*")
    .eq("client_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!attempt) return NextResponse.json({ eligible, attempt: null, trades: [] })

  const { data: trades } = await admin
    .from("cert_virtual_trades")
    .select("*")
    .eq("attempt_id", attempt.id)
    .order("opened_at", { ascending: false })

  const { equity, pnlPercent, unrealizedByTradeId } = await computeEquity(attempt.starting_balance, trades ?? [])

  return NextResponse.json({
    eligible,
    attempt,
    trades: (trades ?? []).map((t) => ({ ...t, unrealizedPnl: t.status === "open" ? unrealizedByTradeId[t.id] ?? null : null })),
    equity,
    pnlPercent,
  })
}
