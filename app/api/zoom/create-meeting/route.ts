import { NextRequest, NextResponse } from "next/server"

async function getZoomAccessToken() {
  const auth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64")

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&account_id=" + process.env.ZOOM_ACCOUNT_ID,
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error("Zoom token error:", errorData, response.status)
    throw new Error(`Failed to get Zoom access token: ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
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
      `https://api.zoom.us/v2/users/${process.env.ZOOM_USER_ID}/meetings`,
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
          meeting_invitees: [],
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
