import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import path from "node:path"
import { findLesson } from "@/lib/course-store"
import { verifyAccessToken, hasCourseAccess, COURSE_COOKIE } from "@/lib/course-access"
import { getPrivateFileSignedUrl } from "@/lib/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Verifies course entitlement, then redirects to a short-lived signed URL
 * from Supabase Storage — the browser's <video> element follows the redirect
 * transparently (including for Range/seek requests), so we don't need to
 * proxy video bytes through this function.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await findLesson(id)
  if (!found) return new Response("Not found", { status: 404 })
  const { course, lesson } = found

  // Free-preview lessons stream to anyone; everything else needs a valid
  // access cookie AND a fresh per-course entitlement check — the cookie only
  // proves who's asking, never which course(s) they're actually entitled to.
  if (!lesson.freePreview) {
    const cookieStore = await cookies()
    const email = verifyAccessToken(cookieStore.get(COURSE_COOKIE)?.value)
    if (!email) return new Response("Forbidden", { status: 403 })
    const ok = await hasCourseAccess(email, course.id)
    if (!ok) return new Response("Forbidden", { status: 403 })
  }

  if (!lesson.video) return new Response("Not found", { status: 404 })
  const url = await getPrivateFileSignedUrl(`course/${path.basename(lesson.video)}`)
  if (!url) return new Response("Not found", { status: 404 })

  return NextResponse.redirect(url, { status: 302 })
}
