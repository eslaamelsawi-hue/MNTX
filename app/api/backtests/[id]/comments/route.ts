import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Same "premium" gate as the Strategy Backtest tab and its video: any
 *  subscription record on file, regardless of status — see the video route
 *  for why this isn't filtered to status = 'active'. */
async function requireSubscriber() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { email: null as string | null }

  const admin = createAdminClient()
  const email = user.email.toLowerCase().trim()
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("id")
    .eq("client_email", email)
    .limit(1)
    .maybeSingle()

  return { email: sub ? email : null, name: (user.user_metadata?.first_name || user.user_metadata?.full_name || email.split("@")[0]) as string }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { email } = await requireSubscriber()
  if (!email) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("backtest_comments")
    .select("id, client_name, client_email, body, created_at")
    .eq("backtest_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { email, name } = await requireSubscriber()
  if (!email) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { comment } = await request.json().catch(() => ({ comment: "" }))
  const body = typeof comment === "string" ? comment.trim() : ""
  if (!body) return NextResponse.json({ error: "Comment is required" }, { status: 400 })
  if (body.length > 2000) return NextResponse.json({ error: "Comment is too long (max 2000 characters)" }, { status: 400 })

  const admin = createAdminClient()
  const { data: backtest } = await admin.from("backtests").select("id, published").eq("id", id).single()
  if (!backtest || !backtest.published) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await admin
    .from("backtest_comments")
    .insert({ backtest_id: id, client_email: email, client_name: name, body })
    .select("id, client_name, client_email, body, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
