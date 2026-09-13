import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("cert_certificate_settings").select("*").eq("id", "main").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const allowed = ["template_url", "image_width", "image_height", "name_x_pct", "name_y_pct", "date_x_pct", "date_y_pct", "font_size", "font_color", "font_family"]
  const filtered: Record<string, unknown> = { id: "main", updated_at: new Date().toISOString() }
  for (const key of allowed) if (key in body) filtered[key] = body[key]

  const supabase = createAdminClient()
  const { data, error } = await supabase.from("cert_certificate_settings").upsert(filtered, { onConflict: "id" }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
