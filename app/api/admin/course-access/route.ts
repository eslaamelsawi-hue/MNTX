import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { COURSE_GRANT_PLAN } from "@/lib/course"
import { listGrants, listGrantsForCourse, grantAccess, revokeAccess } from "@/lib/course-access-store"

const COURSE_SPECIFIC_PLAN = "course-grant"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Without ?courseId=, returns the blanket MNTX ELITE grant list (unchanged
 *  behavior). With it, returns only grants scoped to that one course. */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const courseId = req.nextUrl.searchParams.get("courseId")
  if (courseId) {
    const grants = await listGrantsForCourse(courseId)
    return NextResponse.json({ grants })
  }
  const { grants, store } = await listGrants()
  return NextResponse.json({ grants, store })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const note = typeof body.note === "string" ? body.note.trim() : undefined
  const courseId = typeof body.courseId === "string" && body.courseId ? body.courseId : undefined
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  const plan = courseId ? COURSE_SPECIFIC_PLAN : COURSE_GRANT_PLAN
  const { store } = await grantAccess(email, plan, "admin", note, courseId)
  return NextResponse.json({ success: true, store })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = req.nextUrl.searchParams.get("email")
  const courseId = req.nextUrl.searchParams.get("courseId") || undefined
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })
  const plan = courseId ? COURSE_SPECIFIC_PLAN : COURSE_GRANT_PLAN
  const { store } = await revokeAccess(email, plan, courseId)
  return NextResponse.json({ success: true, store })
}
