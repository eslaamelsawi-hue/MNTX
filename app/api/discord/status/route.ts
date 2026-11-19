import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getViewerEmail } from "@/lib/admin-view"

export async function GET() {
  const viewerEmail = await getViewerEmail()
  if (!viewerEmail) return NextResponse.json({ linked: false }, { status: 401 })

  const admin = createAdminClient()
  const { data: link } = await admin
    .from("discord_links")
    .select("discord_username, role_granted")
    .eq("client_email", viewerEmail)
    .maybeSingle()

  if (!link) return NextResponse.json({ linked: false })
  return NextResponse.json({ linked: true, username: link.discord_username, roleGranted: link.role_granted })
}
