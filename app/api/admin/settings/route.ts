import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const ALLOWED_KEYS = [
  "weekly_booking_limit",
  "discord_invite",
  "telegram_group",
  "weekly_zoom_link",
  "dashboard_ui",
  "subscriptions_open",
  "payment_okx_enabled",
  "payment_nowpayments_enabled",
  "payment_stripe_enabled",
  "payment_egypt_enabled",
]

const BOOLEAN_KEYS = [
  "subscriptions_open",
  "payment_okx_enabled",
  "payment_nowpayments_enabled",
  "payment_stripe_enabled",
  "payment_egypt_enabled",
]

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

function validate(key: string, value: unknown): string | null {
  if (key === "weekly_booking_limit") {
    const num = parseInt(String(value))
    if (isNaN(num) || num < 1 || num > 20) return "Limit must be between 1 and 20"
  }
  if (key === "dashboard_ui" && !["new", "legacy"].includes(String(value))) {
    return "Invalid dashboard_ui value"
  }
  if (BOOLEAN_KEYS.includes(key) && !["true", "false"].includes(String(value))) {
    return `${key} must be "true" or "false"`
  }
  return null
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

async function upsertSetting(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { key, value } = await req.json()

  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  if (value === undefined || value === null || value === "") {
    return NextResponse.json({ error: "Value is required" }, { status: 400 })
  }

  const validationError = validate(key, value)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

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

export async function POST(req: NextRequest) {
  return upsertSetting(req)
}

export async function PATCH(req: NextRequest) {
  return upsertSetting(req)
}
