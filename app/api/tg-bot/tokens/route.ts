/**
 * POST /api/tg-bot/tokens
 * Admin-only route to bulk-import BotSubscription access tokens.
 *
 * Body (JSON):
 *   { "secret": "<ADMIN_SECRET>", "tokens": ["abc123", "def456", ...] }
 *
 * Tokens come from the CSV file that the Telegram bot sends after
 * /members → Add/Delete access token → Create new → Multiple
 * Parse the "Access Token" column and paste the values here.
 *
 * GET /api/tg-bot/tokens
 * Returns remaining unused token count (admin use / health check).
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 500 })
  }

  let body: { secret?: string; tokens?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!Array.isArray(body.tokens) || body.tokens.length === 0) {
    return NextResponse.json({ error: "tokens must be a non-empty array" }, { status: 400 })
  }

  const tokens: string[] = body.tokens
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean)

  if (tokens.length === 0) {
    return NextResponse.json({ error: "No valid tokens found" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const rows = tokens.map((token) => ({ token, plan: "starter", used: false }))

  const { data, error } = await supabase
    .from("tg_access_tokens")
    .upsert(rows, { onConflict: "token", ignoreDuplicates: true })
    .select("id")

  if (error) {
    console.error("[tg-tokens] DB error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    inserted: data?.length ?? 0,
    submitted: tokens.length,
  })
}

export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET
  const authHeader = req.headers.get("authorization") ?? ""
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from("tg_access_tokens")
    .select("id", { count: "exact", head: true })
    .eq("used", false)
    .eq("plan", "starter")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, remaining_tokens: count ?? 0 })
}
