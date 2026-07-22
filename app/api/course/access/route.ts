import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { hasCourseAccess, signAccessToken, COURSE_COOKIE } from "@/lib/course-access"

/**
 * Verifies the logged-in Supabase user, checks course entitlement, and (if
 * entitled) issues the short-lived signed cookie the video route trusts.
 * The email comes from the authenticated session — never from the request body.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ access: false, needsAuth: true }, { status: 401 })
  }

  const email = user.email
  const ok = await hasCourseAccess(email)
  if (!ok) {
    return NextResponse.json({ access: false, email })
  }

  const cookieStore = await cookies()
  cookieStore.set(COURSE_COOKIE, signAccessToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  })

  return NextResponse.json({ access: true, email })
}
