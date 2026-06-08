import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

async function getServerToServerToken() {
  console.log("\n🔐 === TOKEN GENERATION ===")

  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  console.log("Checking credentials:")
  console.log("  ZOOM_CLIENT_ID:", clientId ? `✓ Set (${clientId.substring(0, 10)}...)` : "✗ Missing")
  console.log("  ZOOM_CLIENT_SECRET:", clientSecret ? `✓ Set (${clientSecret.substring(0, 10)}...)` : "✗ Missing")

  if (!clientId || !clientSecret) {
    throw new Error("Missing Zoom Server-to-Server credentials. Please set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in environment variables")
  }

  console.log("✓ Credentials found")

  try {
    console.log("📝 Generating JWT token...")
    const payload = {
      iss: clientId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = jwt.sign(payload, clientSecret)
    console.log("✓ JWT token generated successfully")

    console.log("🌐 Requesting access token from Zoom OAuth endpoint...")
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

    console.log("📊 Zoom token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("❌ Zoom OAuth error response:", errorText)
      throw new Error(`Failed to get Zoom access token: ${tokenResponse.status} - ${errorText}`)
    }

    const data = await tokenResponse.json()
    console.log("✓ Access token received")
    return data.access_token
  } catch (error) {
    console.error("❌ Token generation error:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  console.log("\n=== ZOOM MEETING CREATION REQUEST ===")
  try {
    const body = await req.json()
    const { topic, start_time, duration } = body

    console.log("📥 Request body:", { topic, start_time, duration })

    if (!topic || !start_time || !duration) {
      console.error("❌ Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: topic, start_time, duration" },
        { status: 400 }
      )
    }

    console.log("🔑 Getting Zoom access token...")
    const accessToken = await getServerToServerToken()
    console.log("✓ Access token obtained")

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

    console.log(`📤 Sending request to Zoom API: /v2/users/${accountId}/meetings`)

    if (!zoomResponse.ok) {
      const errorData = await zoomResponse.json()
      console.error("❌ Zoom API Error:", {
        status: zoomResponse.status,
        error: errorData,
      })
      console.error("Full error response:", JSON.stringify(errorData, null, 2))
      return NextResponse.json(
        { error: "Failed to create Zoom meeting", details: errorData },
        { status: 500 }
      )
    }

    const zoomData = await zoomResponse.json()
    console.log("✅ Zoom meeting created successfully:", {
      id: zoomData.id,
      join_url: zoomData.join_url,
      start_url: zoomData.start_url,
    })

    return NextResponse.json({
      id: zoomData.id,
      join_url: zoomData.join_url,
      start_url: zoomData.start_url,
    })
  } catch (error) {
    console.error("❌ Error creating Zoom meeting:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      { error: "Failed to create Zoom meeting", details: String(error) },
      { status: 500 }
    )
  }
}
