import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { joinGuildIfNeeded, grantVipRoleForEmail } from "@/lib/discord"

export async function GET(request: NextRequest) {
  const dashboardUrl = `${request.nextUrl.origin}/dashboard`
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")

  const cookieStore = await cookies()
  const savedState = cookieStore.get("discord_oauth_state")?.value

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${dashboardUrl}?discord=error`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.redirect(`${dashboardUrl}?discord=error`)
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${dashboardUrl}?discord=error`)
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/discord/oauth/callback`
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!tokenRes.ok) throw new Error(`Discord token exchange failed: ${tokenRes.status}`)
    const tokenData = await tokenRes.json()

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!meRes.ok) throw new Error(`Discord user fetch failed: ${meRes.status}`)
    const me = await meRes.json()

    const email = user.email.toLowerCase().trim()
    const admin = createAdminClient()
    await admin.from("discord_links").upsert(
      {
        client_email: email,
        discord_user_id: me.id,
        discord_username: me.username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_email" }
    )

    await joinGuildIfNeeded(me.id, tokenData.access_token)
    await grantVipRoleForEmail(email)

    const res = NextResponse.redirect(`${dashboardUrl}?discord=connected`)
    res.cookies.delete("discord_oauth_state")
    return res
  } catch (e) {
    console.error("[discord/oauth/callback] failed:", e)
    return NextResponse.redirect(`${dashboardUrl}?discord=error`)
  }
}
