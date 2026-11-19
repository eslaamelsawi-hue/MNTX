import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ADMIN_SESSION_COOKIE, ADMIN_VIEW_AS_COOKIE, isAdminSession } from "@/lib/admin-view"

export const runtime = "nodejs"

/** Starts an admin's read-only view of a client's dashboard. */
export async function POST(request: Request) {
  const store = await cookies()
  if (!isAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { email } = await request.json().catch(() => ({ email: "" }))
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }

  store.set(ADMIN_VIEW_AS_COOKIE, email.toLowerCase().trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Short-lived on purpose: a forgotten view shouldn't keep reshaping the
    // admin's own dashboard hours later.
    maxAge: 60 * 60,
    path: "/",
  })
  return NextResponse.json({ success: true })
}

/** Ends it — called whenever the dashboard opens without ?as=. */
export async function DELETE() {
  const store = await cookies()
  store.delete(ADMIN_VIEW_AS_COOKIE)
  return NextResponse.json({ success: true })
}
