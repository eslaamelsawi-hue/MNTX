import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log("\n📍 === ZOOM MEETING CREATION (S2S) ===")

    const body = await req.json()
    const { topic, start_time, duration } = body

    console.log("📥 Request:", { topic, start_time, duration })

    if (!topic || !start_time || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: topic, start_time, duration" },
        { status: 400 }
      )
    }

    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET
    const accountId = process.env.ZOOM_ACCOUNT_ID

    console.log("🔐 Credentials check:")
    console.log("  CLIENT_ID:", clientId ? "✓" : "✗")
    console.log("  CLIENT_SECRET:", clientSecret ? "✓" : "✗")
    console.log("  ACCOUNT_ID:", accountId ? "✓" : "✗")

    if (!clientId || !clientSecret || !accountId) {
      return NextResponse.json(
        { error: "Missing Zoom credentials" },
        { status: 500 }
      )
    }

    // Use Basic Auth directly with Zoom API
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    console.log("📤 Calling Zoom API with Basic Auth...")

    const zoomResponse = await fetch(
      `https://api.zoom.us/v2/users/${accountId}/meetings`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          start_time,
          duration,
          timezone: "Africa/Cairo",
          type: 2,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: false,
            meeting_authentication: false,
          },
        }),
      }
    )

    console.log("📊 Response status:", zoomResponse.status)

    if (!zoomResponse.ok) {
      const errorData = await zoomResponse.json()
      console.error("❌ Zoom API error:", errorData)
      return NextResponse.json(
        { error: "Failed to create Zoom meeting", details: errorData },
        { status: 500 }
      )
    }

    const zoomData = await zoomResponse.json()
    console.log("✅ Meeting created:", { id: zoomData.id, join_url: zoomData.join_url })

    return NextResponse.json({
      id: zoomData.id,
      join_url: zoomData.join_url,
      start_url: zoomData.start_url,
    })
  } catch (error) {
    console.error("❌ Error:", error)
    return NextResponse.json(
      { error: "Failed to create Zoom meeting", details: String(error) },
      { status: 500 }
    )
  }
}
