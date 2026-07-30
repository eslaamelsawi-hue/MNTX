import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Returns notifications for the LOGGED-IN user only — the email comes from
 *  the authenticated session, so a client can never read anyone else's. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ notifications: [] }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("client_email", user.email.toLowerCase().trim())
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, markAllRead } = body
  const email = user.email.toLowerCase().trim()
  const admin = createAdminClient()

  if (markAllRead) {
    const { error } = await admin.from("notifications").update({ read: true }).eq("client_email", email).eq("read", false)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (!id) return NextResponse.json({ error: "id or markAllRead is required" }, { status: 400 })
  const { error } = await admin.from("notifications").update({ read: true }).eq("id", id).eq("client_email", email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
