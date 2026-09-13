import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { finalizeAttempt } from "@/lib/certification"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Lets an admin force-finalize a client's attempt (e.g. they finished
 *  trading but never came back to click "Finalize" themselves). */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { attemptId } = await req.json().catch(() => ({}))
  if (!attemptId) return NextResponse.json({ error: "attemptId is required" }, { status: 400 })

  const result = await finalizeAttempt(attemptId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ attempt: result.attempt })
}
