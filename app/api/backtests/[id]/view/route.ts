import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Records one view per (backtest, client) — repeat views by the same
 *  person never increment the count, since the unique constraint on
 *  (backtest_id, client_email) makes this insert a no-op after the first. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { client_email } = await req.json()
  if (!client_email) return NextResponse.json({ error: "client_email is required" }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("backtest_views")
    .upsert(
      { backtest_id: id, client_email: client_email.toLowerCase().trim() },
      { onConflict: "backtest_id,client_email", ignoreDuplicates: true }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count } = await supabase
    .from("backtest_views")
    .select("id", { count: "exact", head: true })
    .eq("backtest_id", id)

  return NextResponse.json({ view_count: count ?? 0 })
}
