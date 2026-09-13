import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { hasCourseAccess, signAccessToken, COURSE_COOKIE } from "@/lib/course-access"
import { grantAccess } from "@/lib/course-access-store"
import { COURSE_GRANT_PLAN } from "@/lib/course"

/**
 * Handles a "Subscribe" click on a specific course: if the signed-in user
 * already qualifies for THIS course (a grant, or a paid order for a plan
 * this course accepts), record an explicit per-course grant so future
 * checks are simple, and issue the access cookie. Otherwise report back so
 * the client can forward them to the $999 1-on-1 coaching checkout.
 * The email always comes from the authenticated session, never the request body.
 */
export async function POST(request: Request) {
  try {
    const { courseId } = await request.json().catch(() => ({}))
    if (!courseId) {
      return NextResponse.json({ access: false, error: "courseId is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ access: false, needsAuth: true }, { status: 401 })
    }

    const email = user.email

    const entitled = await hasCourseAccess(email, courseId)
    if (!entitled) {
      return NextResponse.json({ access: false, email })
    }

    // Scoped to this course specifically — never over-grants blanket access
    // just because the client qualified via a course-specific purchase.
    await grantAccess(email, COURSE_GRANT_PLAN, "auto:subscribe", undefined, courseId)

    const cookieStore = await cookies()
    cookieStore.set(COURSE_COOKIE, signAccessToken(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60,
    })

    return NextResponse.json({ access: true, email })
  } catch (e) {
    console.error("[course/subscribe] handler crashed:", e)
    return NextResponse.json({ access: false }, { status: 500 })
  }
}
