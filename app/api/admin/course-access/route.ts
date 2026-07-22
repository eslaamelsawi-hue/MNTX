import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { COURSE_GRANT_PLAN } from "@/lib/course"
import { listGrants, grantAccess, revokeAccess } from "@/lib/course-access-store"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { grants, store } = await listGrants()
  return NextResponse.json({ grants, store })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const note = typeof body.note === "string" ? body.note.trim() : undefined
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  const { store } = await grantAccess(email, COURSE_GRANT_PLAN, "admin", note)
  return NextResponse.json({ success: true, store })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = new URL(req.url).searchParams.get("email")
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })
  const { store } = await revokeAccess(email, COURSE_GRANT_PLAN)
  return NextResponse.json({ success: true, store })
}
