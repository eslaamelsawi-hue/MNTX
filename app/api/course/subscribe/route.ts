import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasCourseAccess, signAccessToken, COURSE_COOKIE } from "@/lib/course-access"
import { grantAccess } from "@/lib/course-access-store"
import { COURSE_GRANT_PLAN } from "@/lib/course"

/**
 * Handles a "Subscribe" click on a course: if the signed-in user already has
 * an active premium plan (user_subscriptions) or any other course entitlement
 * (admin grant / paid order), grant them course access. Otherwise report back
 * so the client can forward them to the $900 1-on-1 coaching checkout.
 * The email always comes from the authenticated session, never the request body.
 */
export async function POST() {
  // TEMP: whole handler wrapped so a crash returns its real message as JSON
  // (status 200 on purpose) instead of an opaque empty 500. Remove once root-caused.
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ access: false, needsAuth: true }, { status: 401 })
    }

    const email = user.email

    let plan: string | null = null
    let debugError: string | null = null
    let debugSubs: unknown = null
    try {
      const admin = createAdminClient()
      const { data: subs, error } = await admin
        .from("user_subscriptions")
        .select("plan, status")
        .ilike("client_email", email.trim())
        .order("created_at", { ascending: false })
        .limit(5)
      if (error) {
        console.error("[course/subscribe] user_subscriptions lookup failed:", error)
        debugError = error.message
      }
      debugSubs = subs
      const active = subs?.find((s) => (s.status ?? "").trim().toLowerCase() === "active")
      plan = active?.plan ?? null
    } catch (e) {
      console.error("[course/subscribe] user_subscriptions lookup threw:", e)
      debugError = e instanceof Error ? e.message : String(e)
    }

    const viaHasCourseAccess = plan === null ? await hasCourseAccess(email) : null
    const entitled = plan !== null || !!viaHasCourseAccess
    if (!entitled) {
      return NextResponse.json({
        access: false,
        email,
        debug: { queriedEmail: email.trim(), subs: debugSubs, queryError: debugError, viaHasCourseAccess },
      })
    }

    await grantAccess(email, plan ?? COURSE_GRANT_PLAN, "auto:subscribe")

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
    return NextResponse.json(
      {
        access: false,
        crashed: true,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      },
      { status: 200 },
    )
  }
}
