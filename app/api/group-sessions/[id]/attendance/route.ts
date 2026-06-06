import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { registration_id, attended } = body

  if (!registration_id) {
    return NextResponse.json({ error: "registration_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("group_session_registrations")
    .update({ attended })
    .eq("id", registration_id)
    .eq("session_id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ registration: data })
}
