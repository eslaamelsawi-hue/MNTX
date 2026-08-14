import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markOverdueInstallmentsAndNotify } from "@/lib/invoicing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Runs on a schedule (see vercel.json) and flips any subscription whose
 * expires_at has passed from "active" to "expired", and any invoice
 * installment (e.g. the 2nd half of a split payment) past its due date to
 * "overdue" — with a one-time reminder notification. Protected by
 * CRON_SECRET so this can't be triggered by an outside request — Vercel
 * Cron sends it automatically as a Bearer token; without a matching secret
 * configured, the route refuses to run rather than silently allowing
 * unauthenticated writes.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/expire-subscriptions] CRON_SECRET is not set — refusing to run.")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso)
    .select("id, client_email, plan")

  if (error) {
    console.error("[cron/expire-subscriptions] failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const invoiceResult = await markOverdueInstallmentsAndNotify().catch((e) => {
    console.error("[cron/expire-subscriptions] overdue-installment check failed:", e)
    return { overdue: 0, notified: 0 }
  })

  return NextResponse.json({
    expired: data?.length ?? 0,
    subscriptions: data ?? [],
    overdueInstallments: invoiceResult.overdue,
    overdueNotificationsSent: invoiceResult.notified,
  })
}
