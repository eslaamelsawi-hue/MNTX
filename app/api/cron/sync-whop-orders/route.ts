import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { settleWhopOrderIfPaid } from "@/lib/whop-fulfillment"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Sweeps recent pending card orders and settles any that Whop reports as
 * paid — the safety net for buyers who closed the tab before the success
 * page could verify, and for webhooks that never arrived at all.
 *
 * Only looks at the last 7 days: older pending rows are abandoned
 * checkouts, and Whop's payment list only reaches back so far anyway.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/sync-whop-orders] CRON_SECRET is not set — refusing to run.")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const supabase = createAdminClient()
  const { data: pending, error } = await supabase
    .from("whop_orders")
    .select("order_id")
    .eq("status", "pending")
    .gte("created_at", since)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = new URL(req.url).origin
  let settled = 0
  for (const row of pending ?? []) {
    try {
      const result = await settleWhopOrderIfPaid(row.order_id, origin)
      if (result.status === "paid" && !result.alreadyPaid) settled++
    } catch (e) {
      console.error(`[cron/sync-whop-orders] ${row.order_id} failed:`, e)
    }
  }

  return NextResponse.json({ checked: pending?.length ?? 0, settled })
}
