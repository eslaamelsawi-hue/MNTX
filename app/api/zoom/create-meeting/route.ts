import { NextRequest, NextResponse } from "next/server";

async function getZoomAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Missing Zoom credentials");
  }

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get Zoom access token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { topic, start_time, duration } = await request.json();
    const accessToken = await getZoomAccessToken();

    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time,
        duration,
        timezone: "Africa/Cairo",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: "cloud",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Zoom API error:", error);
      return NextResponse.json(
        { error: "Failed to create Zoom meeting" },
        { status: 500 }
      );
    }

    const meeting = await response.json();
    return NextResponse.json(meeting);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Zoom error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
