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
  let { title, description, session_date, start_time, end_time, max_participants, zoom_meeting_id, zoom_join_url, zoom_start_url } = body

  if (!title || !session_date || !start_time || !end_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Calculate duration in minutes
  const [startH, startM] = start_time.split(":").map(Number)
  const [endH, endM] = end_time.split(":").map(Number)
  const duration = (endH * 60 + endM) - (startH * 60 + startM)

  // Create Zoom meeting if not provided
  if (!zoom_join_url) {
    try {
      const zoomRes = await fetch(
        `${req.nextUrl.origin}/api/zoom/create-meeting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: title,
            start_time: `${session_date}T${start_time}`,
            duration,
          }),
        }
      )

      if (zoomRes.ok) {
        const zoomData = await zoomRes.json()
        zoom_meeting_id = zoomData.zoom_meeting_id
        zoom_join_url = zoomData.zoom_join_url
        zoom_start_url = zoomData.zoom_start_url
        console.log("Zoom meeting created:", { zoom_meeting_id, zoom_join_url })
      } else {
        const errorData = await zoomRes.json()
        console.error("Failed to create Zoom meeting:", errorData)
      }
    } catch (e) {
      console.error("Zoom meeting creation failed:", e)
    }
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
