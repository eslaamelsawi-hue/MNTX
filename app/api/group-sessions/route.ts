import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("group_zoom_sessions")
    .select("*")
    .gte("session_date", new Date().toISOString().split("T")[0])
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, session_date, start_time, end_time, max_participants, zoom_meeting_id, zoom_join_url, zoom_start_url } = body

  if (!title || !session_date || !start_time || !end_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("group_zoom_sessions")
    .insert({
      title,
      description,
      session_date,
      start_time,
      end_time,
      max_participants,
      zoom_meeting_id,
      zoom_join_url,
      zoom_start_url,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
