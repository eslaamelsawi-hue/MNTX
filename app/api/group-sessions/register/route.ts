import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { session_id, client_email, client_name } = body

  if (!session_id || !client_email || !client_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Check if already registered
  const { data: existing } = await supabase
    .from("group_session_registrations")
    .select("id")
    .eq("session_id", session_id)
    .eq("client_email", client_email.toLowerCase().trim())
    .single()

  if (existing) {
    return NextResponse.json({ error: "Already registered for this session" }, { status: 400 })
  }

  // Register user
  const { data, error } = await supabase
    .from("group_session_registrations")
    .insert({
      session_id,
      client_email: client_email.toLowerCase().trim(),
      client_name,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ registration: data })
}
