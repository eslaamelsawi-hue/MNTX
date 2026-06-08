import { NextRequest, NextResponse } from "next/server"

// Server-to-Server OAuth: exchange credentials for an access token.
// Grant type MUST be "account_credentials" for S2S apps.
async function getAccessToken() {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID

  console.log("🔐 Credentials check:")
  console.log("  CLIENT_ID:", clientId ? "✓" : "✗ MISSING")
  console.log("  CLIENT_SECRET:", clientSecret ? "✓" : "✗ MISSING")
  console.log("  ACCOUNT_ID:", accountId ? "✓" : "✗ MISSING")

  if (!clientId || !clientSecret || !accountId) {
    throw new Error("Missing Zoom credentials (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID)")
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  )

  const tokenText = await tokenResponse.text()
  console.log("📊 Token response status:", tokenResponse.status)

  if (!tokenResponse.ok) {
    console.error("❌ Token error:", tokenText)
    throw new Error(`Failed to get Zoom token: ${tokenResponse.status} - ${tokenText}`)
  }

  const tokenData = JSON.parse(tokenText)
  console.log("✅ Access token received")
  return tokenData.access_token
}

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

    const accessToken = await getAccessToken()

    console.log("📤 Creating meeting via Zoom API...")

    const zoomResponse = await fetch(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
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

    console.log("📊 Meeting response status:", zoomResponse.status)

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
