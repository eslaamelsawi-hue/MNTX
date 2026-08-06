import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("backtests").select("*").order("created_at", { ascending: false })
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

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const {
    title, description, symbol, timeframe, period_start, period_end,
    win_rate, total_trades, profit_factor, net_profit_pct, max_drawdown_pct,
    cover_image_url, trades, published,
  } = body
  if (!title || !symbol || !timeframe) {
    return NextResponse.json({ error: "title, symbol, and timeframe are required" }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("backtests").insert({
    title,
    description: description || null,
    symbol,
    timeframe,
    period_start: period_start || null,
    period_end: period_end || null,
    win_rate: win_rate ?? null,
    total_trades: total_trades ?? (Array.isArray(trades) ? trades.length : 0),
    profit_factor: profit_factor ?? null,
    net_profit_pct: net_profit_pct ?? null,
    max_drawdown_pct: max_drawdown_pct ?? null,
    cover_image_url: cover_image_url || null,
    trades: Array.isArray(trades) ? trades : [],
    published: published ?? false,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ backtest: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const allowed = [
    "title", "description", "symbol", "timeframe", "period_start", "period_end",
    "win_rate", "total_trades", "profit_factor", "net_profit_pct", "max_drawdown_pct",
    "cover_image_url", "trades", "published",
  ]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) { if (key in updates) filtered[key] = updates[key] }
  filtered.updated_at = new Date().toISOString()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("backtests").update(filtered).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ backtest: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from("backtests").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
