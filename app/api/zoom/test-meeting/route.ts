import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID

  // Step 1: check credentials
  if (!clientId || !clientSecret || !accountId) {
    return NextResponse.json({
      step: "credentials",
      error: "Missing credentials",
      ZOOM_CLIENT_ID: clientId ? "SET" : "MISSING",
      ZOOM_CLIENT_SECRET: clientSecret ? "SET" : "MISSING",
      ZOOM_ACCOUNT_ID: accountId ? "SET" : "MISSING",
    })
  }

  // Step 2: get token
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  let accessToken: string

  try {
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      return NextResponse.json({
        step: "get_token",
        status: tokenRes.status,
        error: tokenText,
        hint: tokenRes.status === 400 ? "Your Zoom app is NOT a Server-to-Server OAuth app. Go to marketplace.zoom.us and create a Server-to-Server OAuth app." : undefined,
      })
    }
    const tokenData = JSON.parse(tokenText)
    accessToken = tokenData.access_token
  } catch (e) {
    return NextResponse.json({ step: "get_token", error: String(e) })
  }

  // Step 3: create a test meeting
  try {
    const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: "Test Meeting",
        type: 2,
        start_time: new Date(Date.now() + 3600000).toISOString(),
        duration: 60,
        timezone: "Africa/Cairo",
      }),
    })
    const meetingText = await meetingRes.text()
    if (!meetingRes.ok) {
      return NextResponse.json({
        step: "create_meeting",
        status: meetingRes.status,
        error: meetingText,
      })
    }
    const meetingData = JSON.parse(meetingText)
    return NextResponse.json({
      success: true,
      meeting_id: meetingData.id,
      join_url: meetingData.join_url,
      message: "Zoom is working correctly!",
    })
  } catch (e) {
    return NextResponse.json({ step: "create_meeting", error: String(e) })
  }
}
