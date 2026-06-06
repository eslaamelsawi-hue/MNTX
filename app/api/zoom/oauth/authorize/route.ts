import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const clientId = process.env.ZOOM_OAUTH_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}`}/api/zoom/oauth/callback`

  const authUrl = new URL("https://zoom.us/oauth/authorize")
  authUrl.searchParams.set("client_id", clientId!)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", "meeting:write")

  return NextResponse.redirect(authUrl)
}
