import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard`)
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "Discord is not configured." }, { status: 500 })
  }

  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri = `${request.nextUrl.origin}/api/discord/oauth/callback`

  const authorizeUrl = new URL("https://discord.com/api/oauth2/authorize")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "identify guilds.join")
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("prompt", "consent")

  const res = NextResponse.redirect(authorizeUrl.toString())
  res.cookies.set("discord_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return res
}
