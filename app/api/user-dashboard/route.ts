import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email } = body
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: subscriptions, error: subError } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("client_email", normalizedEmail)
    .order("created_at", { ascending: false })

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  const { data: bookings, error: bookError } = await supabase
    .from("bookings")
    .select("id, client_name, duration, status, created_at, zoom_join_url, client_timezone, availability_slots(date, start_time, end_time)")
    .eq("client_email", normalizedEmail)
    .order("created_at", { ascending: false })

  if (bookError) return NextResponse.json({ error: bookError.message }, { status: 500 })

  const { data: settingsRows } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["weekly_zoom_link", "discord_invite", "telegram_group"])

  const settings: Record<string, string> = {}
  settingsRows?.forEach((s) => { settings[s.key] = s.value })

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, subscriptions, bookings: bookings || [], settings })
}
