import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ linked: false }, { status: 401 })

  const admin = createAdminClient()
  const { data: link } = await admin
    .from("discord_links")
    .select("discord_username, role_granted")
    .eq("client_email", user.email.toLowerCase().trim())
    .maybeSingle()

  if (!link) return NextResponse.json({ linked: false })
  return NextResponse.json({ linked: true, username: link.discord_username, roleGranted: link.role_granted })
}
