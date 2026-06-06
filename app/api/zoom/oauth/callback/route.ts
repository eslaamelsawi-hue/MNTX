import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.json({ error: "No authorization code provided" }, { status: 400 })
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}`}/api/zoom/oauth/callback`

    // Exchange code for access token
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_OAUTH_CLIENT_ID}:${process.env.ZOOM_OAUTH_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      console.error("Zoom token error:", error)
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()

    // Store token in database
    const supabase = createAdminClient()
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    const { error } = await supabase
      .from("zoom_oauth_token")
      .delete()
      .neq("id", 0) // Delete all existing tokens

    if (!error) {
      await supabase
        .from("zoom_oauth_token")
        .insert({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
        })
    }

    // Redirect to admin dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}`}/admin?zoom_connected=true`)
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.json({ error: "OAuth callback failed" }, { status: 500 })
  }
}
