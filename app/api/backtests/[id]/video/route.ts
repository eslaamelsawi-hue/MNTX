import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getViewerEmail } from "@/lib/admin-view"
import { getPlayableUrl } from "@/lib/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Verifies the logged-in user has a subscription on file — the same
 * "premium" gate the Strategy Backtest tab itself uses (hasCoaching =
 * subscriptions.length > 0 client-side, not filtered by status), so a
 * client who can see the tab and the report can also play its video.
 * Then redirects to a short-lived signed URL for the video — the browser's
 * <video> element follows the redirect transparently, including for
 * Range/seek requests.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // The signed-in client, or the account an admin is viewing from the Users
  // page — the same resolution the dashboard's other reads use.
  const viewerEmail = await getViewerEmail()
  if (!viewerEmail) return new Response("Unauthorized", { status: 401 })

  const admin = createAdminClient()

  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("id")
    .eq("client_email", viewerEmail)
    .limit(1)
    .maybeSingle()
  if (!sub) return new Response("Forbidden", { status: 403 })

  const { data: backtest } = await admin
    .from("backtests")
    .select("video, published")
    .eq("id", id)
    .single()
  if (!backtest || !backtest.published || !backtest.video) {
    return new Response("Not found", { status: 404 })
  }

  const url = await getPlayableUrl(`backtests/${backtest.video}`)
  if (!url) return new Response("Not found", { status: 404 })

  return NextResponse.redirect(url, { status: 302 })
}
