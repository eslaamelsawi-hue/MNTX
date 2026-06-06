import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function getZoomAccessToken() {
  const supabase = createAdminClient()

  // Get token from database
  const { data, error } = await supabase
    .from("zoom_oauth_token")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data?.access_token) {
    throw new Error("No Zoom OAuth token found. Please authorize Zoom first.")
  }

  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Token expired, refresh it
    if (!data.refresh_token) {
      throw new Error("Token expired and no refresh token available")
    }

    const refreshResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_OAUTH_CLIENT_ID}:${process.env.ZOOM_OAUTH_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
      }).toString(),
    })

    if (!refreshResponse.ok) {
      throw new Error("Failed to refresh Zoom token")
    }

    const newTokenData = await refreshResponse.json()
    const expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000)

    // Update token in database
    await supabase
      .from("zoom_oauth_token")
      .update({
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
        expires_at: expiresAt,
      })
      .eq("id", data.id)

    return newTokenData.access_token
  }

  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, start_time, duration } = body

    if (!topic || !start_time || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const accessToken = await getZoomAccessToken()

    const zoomResponse = await fetch(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          start_time,
          duration,
          timezone: "UTC",
          type: 2,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: false,
          },
        }),
      }
    )

    if (!zoomResponse.ok) {
      const error = await zoomResponse.json()
      console.error("Zoom API error:", error, zoomResponse.status)
      return NextResponse.json(
        { error: "Failed to create Zoom meeting", details: error },
        { status: 500 }
      )
    }

    const zoomData = await zoomResponse.json()
    console.log("Zoom meeting created successfully:", { id: zoomData.id, join_url: zoomData.join_url })

    return NextResponse.json({
      zoom_meeting_id: zoomData.id,
      zoom_join_url: zoomData.join_url,
      zoom_start_url: zoomData.start_url,
    })
  } catch (error) {
    console.error("Error creating Zoom meeting:", error)
    return NextResponse.json(
      { error: "Failed to create Zoom meeting", details: String(error) },
      { status: 500 }
    )
  }
}
