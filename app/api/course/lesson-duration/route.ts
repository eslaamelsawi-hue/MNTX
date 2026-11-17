import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findLesson, updateLesson } from "@/lib/course-store"
import { verifyAccessToken, hasCourseAccess, COURSE_COOKIE } from "@/lib/course-access"

export const runtime = "nodejs"

/** Seconds → "mm:ss", or "h:mm:ss" once past an hour. */
function format(total: number): string {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = Math.floor(total % 60)
  const pad = (n: number) => String(n).padStart(2, "0")
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/**
 * The player reports how long a lesson actually is, once the browser has read
 * the file's metadata. Lesson durations are typed by hand in the admin form
 * and were left at 00:00, so this fills them in from the file itself as
 * lessons get watched.
 *
 * Only ever fills a blank: a duration an admin has set is never overwritten,
 * and the caller must be entitled to the lesson, so this can't be used to
 * poke at the course structure.
 */
export async function POST(request: Request) {
  try {
    const { lessonId, seconds } = await request.json()
    if (!lessonId || typeof lessonId !== "string") {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 })
    }
    const total = Number(seconds)
    if (!Number.isFinite(total) || total <= 0 || total > 24 * 60 * 60) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 })
    }

    const found = await findLesson(lessonId)
    if (!found) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    const { course, section, lesson } = found

    if (!lesson.freePreview) {
      const cookieStore = await cookies()
      const email = verifyAccessToken(cookieStore.get(COURSE_COOKIE)?.value)
      if (!email) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      if (!(await hasCourseAccess(email, course.id))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const existing = (lesson.duration ?? "").trim()
    const alreadySet = existing !== "" && existing !== "00:00" && existing !== "0:00"
    if (alreadySet) return NextResponse.json({ success: true, duration: existing, kept: true })

    const duration = format(total)
    await updateLesson(course.id, section.id, lesson.id, { duration })
    return NextResponse.json({ success: true, duration })
  } catch (error) {
    console.error("[course/lesson-duration] failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
