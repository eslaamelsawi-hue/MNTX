import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("backtests")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .single()
  if (error || !data) return NextResponse.json({ error: "Backtest not found" }, { status: 404 })

  const { count } = await supabase
    .from("backtest_views")
    .select("id", { count: "exact", head: true })
    .eq("backtest_id", id)

  return NextResponse.json({ backtest: { ...data, view_count: count ?? 0 } })
}
