import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email } = body

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get all registrations for this email
  const { data, error } = await supabase
    .from("group_session_registrations")
    .select("session_id")
    .eq("client_email", email.toLowerCase().trim())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const registeredSessionIds = data?.map(r => r.session_id) ?? []

  return NextResponse.json({ registeredSessionIds })
}
