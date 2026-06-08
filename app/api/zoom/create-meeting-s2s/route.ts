import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

async function getServerToServerToken() {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("❌ Missing Zoom credentials:")
    console.error("  ZOOM_CLIENT_ID:", clientId ? "✓ Set" : "✗ Missing")
    console.error("  ZOOM_CLIENT_SECRET:", clientSecret ? "✓ Set" : "✗ Missing")
    throw new Error("Missing Zoom Server-to-Server credentials. Please set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env.local")
  }

  console.log("✓ Zoom credentials found, generating JWT token...")

  const payload = {
    iss: clientId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }

  const token = jwt.sign(payload, clientSecret)

  const tokenResponse = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }).toString(),
  })

  if (!tokenResponse.ok) {
    throw new Error("Failed to get Zoom access token")
  }

  const data = await tokenResponse.json()
  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, start_time, duration } = body

    if (!topic || !start_time || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: topic, start_time, duration" },
        { status: 400 }
      )
    }

    const accessToken = await getServerToServerToken()
    const accountId = process.env.ZOOM_ACCOUNT_ID

    if (!accountId) {
      console.error("❌ Missing ZOOM_ACCOUNT_ID")
      return NextResponse.json(
        { error: "Missing ZOOM_ACCOUNT_ID in environment variables" },
        { status: 500 }
      )
    }

    console.log("📍 Creating Zoom meeting with:")
    console.log("  Topic:", topic)
    console.log("  Start time:", start_time)
    console.log("  Duration:", duration, "minutes")
    console.log("  Account ID:", accountId)

    const zoomResponse = await fetch(
      `https://api.zoom.us/v2/users/${accountId}/meetings`,
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

    if (!zoomResponse.ok) {
      const errorData = await zoomResponse.json()
      console.error("Zoom API error:", errorData, zoomResponse.status)
      return NextResponse.json(
        { error: "Failed to create Zoom meeting", details: errorData },
        { status: 500 }
      )
    }

    const zoomData = await zoomResponse.json()
    console.log("✅ Zoom meeting created:", {
      id: zoomData.id,
      join_url: zoomData.join_url,
    })

    return NextResponse.json({
      id: zoomData.id,
      join_url: zoomData.join_url,
      start_url: zoomData.start_url,
    })
  } catch (error) {
    console.error("❌ Error creating Zoom meeting:", error)
    return NextResponse.json(
      { error: "Failed to create Zoom meeting", details: String(error) },
      { status: 500 }
    )
  }
}
