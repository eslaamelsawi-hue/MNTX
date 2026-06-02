import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

const ALLOWED_KEYS = ["weekly_booking_limit"]

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ALLOWED_KEYS)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }

  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const { key, value } = await req.json()

  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  if (value === undefined || value === null || value === "") {
    return NextResponse.json({ error: "Value is required" }, { status: 400 })
  }

  if (key === "weekly_booking_limit") {
    const num = parseInt(String(value))
    if (isNaN(num) || num < 1 || num > 20) {
      return NextResponse.json({ error: "Limit must be between 1 and 20" }, { status: 400 })
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      { key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
