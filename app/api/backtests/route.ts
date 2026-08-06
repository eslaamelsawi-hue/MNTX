import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("backtests")
    .select("id, title, description, symbol, timeframe, period_start, period_end, win_rate, total_trades, profit_factor, net_profit_pct, max_drawdown_pct, cover_image_url, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (data ?? []).map((b) => b.id)
  const viewCounts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: views } = await supabase.from("backtest_views").select("backtest_id").in("backtest_id", ids)
    for (const v of views ?? []) viewCounts[v.backtest_id] = (viewCounts[v.backtest_id] || 0) + 1
  }

  const backtests = (data ?? []).map((b) => ({ ...b, view_count: viewCounts[b.id] || 0 }))
  return NextResponse.json({ backtests })
}
