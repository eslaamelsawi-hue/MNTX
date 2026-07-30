import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Returns preferences for the LOGGED-IN user only — the email comes from
 *  the authenticated session, so a client can never read/write anyone else's. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from("client_preferences")
    .select("email_notifications")
    .eq("client_email", user.email.toLowerCase().trim())
    .maybeSingle()

  return NextResponse.json({ email_notifications: data?.email_notifications ?? true })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { email_notifications } = body
  if (typeof email_notifications !== "boolean") {
    return NextResponse.json({ error: "email_notifications must be a boolean" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("client_preferences").upsert({
    client_email: user.email.toLowerCase().trim(),
    email_notifications,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
