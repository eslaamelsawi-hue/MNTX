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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ access: false, needsAuth: true }, { status: 401 })
  }

  const email = user.email

  let plan: string | null = null
  try {
    const admin = createAdminClient()
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("plan")
      .eq("client_email", email.toLowerCase().trim())
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    plan = sub?.plan ?? null
  } catch {
    // no active subscription row — fall through to the entitlement check below
  }

  const entitled = plan !== null || (await hasCourseAccess(email))
  if (!entitled) {
    return NextResponse.json({ access: false, email })
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
}
