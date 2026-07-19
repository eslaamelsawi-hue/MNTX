import { NextRequest, NextResponse } from "next/server"

async function getAccessToken() {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID
  if (!clientId || !clientSecret || !accountId) {
    throw new Error("Missing Zoom credentials")
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const tokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } }
  )
  const tokenText = await tokenResponse.text()
  if (!tokenResponse.ok) throw new Error(`Failed to get Zoom token: ${tokenResponse.status} - ${tokenText}`)
  return JSON.parse(tokenText).access_token
}

// Convert any incoming time to Zoom's exact format: "YYYY-MM-DDTHH:mm:ssZ" (GMT, NO milliseconds).
// A value with no timezone is treated as Cairo local time. This stops the "scheduled for now" bug.
function toZoomUtc(raw: string): string {
  let s = String(raw).trim()
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
  if (hasZone) return new Date(s).toISOString().replace(/\.\d{3}Z$/, "Z")
  if (/T\d{2}:\d{2}$/.test(s)) s += ":00"
  const datePart = s.slice(0, 10)
  const probe = new Date(`${datePart}T12:00:00Z`)
  const offsetMs =
    new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime() -
    new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  return new Date(new Date(`${s}Z`).getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "Z")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, start_time, duration } = body

    const missing: string[] = []
    if (!topic) missing.push("topic")
    if (!start_time) missing.push("start_time")
    if (!duration) missing.push("duration")
    if (missing.length > 0) {
      return NextResponse.json({ error: "Missing required fields", missing, received: body }, { status: 400 })
    }

    const startUtc = toZoomUtc(start_time)
    console.log("Zoom start_time:", { received: start_time, sentToZoom: startUtc })

    const accessToken = await getAccessToken()

    const zoomResponse = await fetch(`https://api.zoom.us/v2/users/me/meetings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startUtc,
        duration,
        timezone: "Africa/Cairo",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: false,
          meeting_authentication: false,
        },
      }),
    })

    if (!zoomResponse.ok) {
      const errorData = await zoomResponse.json()
      return NextResponse.json({ error: "Failed to create Zoom meeting", details: errorData }, { status: 500 })
    }

    const zoomData = await zoomResponse.json()
    return NextResponse.json({
      id: zoomData.id,
      join_url: zoomData.join_url,
      start_url: zoomData.start_url,
      scheduled_for: zoomData.start_time,
      sent_start_time: startUtc,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create Zoom meeting", details: String(error) }, { status: 500 })
  }
}
