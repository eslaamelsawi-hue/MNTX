import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson,
  reorderSections,
  reorderLessons,
} from "@/lib/course-store"

export const runtime = "nodejs"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ courses: await listCourses() })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { action } = body

  try {
    switch (action) {
      case "createCourse":
        return NextResponse.json({ course: await createCourse(body.data || {}) })
      case "updateCourse":
        return NextResponse.json({ course: await updateCourse(body.id, body.patch || {}) })
      case "deleteCourse":
        return NextResponse.json({ success: await deleteCourse(body.id) })
      case "addSection":
        return NextResponse.json({ section: await addSection(body.courseId, body.data || {}) })
      case "updateSection":
        return NextResponse.json({ success: await updateSection(body.courseId, body.sectionId, body.patch || {}) })
      case "deleteSection":
        return NextResponse.json({ success: await deleteSection(body.courseId, body.sectionId) })
      case "addLesson":
        return NextResponse.json({ lesson: await addLesson(body.courseId, body.sectionId, body.data || {}) })
      case "updateLesson":
        return NextResponse.json({ success: await updateLesson(body.courseId, body.sectionId, body.lessonId, body.patch || {}) })
      case "deleteLesson":
        return NextResponse.json({ success: await deleteLesson(body.courseId, body.sectionId, body.lessonId) })
      case "reorderSections":
        return NextResponse.json({ success: await reorderSections(body.courseId, body.orderedIds || []) })
      case "reorderLessons":
        return NextResponse.json({ success: await reorderLessons(body.courseId, body.sectionId, body.orderedIds || []) })
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
