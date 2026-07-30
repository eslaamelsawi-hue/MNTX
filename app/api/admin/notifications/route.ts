import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification, broadcastNotification } from "@/lib/notifications"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { client_email, title, message, type, link, broadcast, send_email } = body
  if (!title || !message) return NextResponse.json({ error: "title and message are required" }, { status: 400 })

  if (broadcast) {
    await broadcastNotification({ title, message, type, link, sendEmail: !!send_email })
    return NextResponse.json({ ok: true })
  }

  if (!client_email) return NextResponse.json({ error: "client_email is required (or set broadcast: true)" }, { status: 400 })
  await createNotification({ clientEmail: client_email, title, message, type, link, sendEmail: !!send_email })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from("notifications").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
