import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { listWaitlistEntries, deleteWaitlistEntry } from "@/lib/waitlist-store"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { entries, store } = await listWaitlistEntries()
  return NextResponse.json({ entries, store })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  await deleteWaitlistEntry(id)
  return NextResponse.json({ success: true })
}
