import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { finalizeAttempt } from "@/lib/certification"

/**
 * Finalizes a client's own certification attempt once their 3-week window
 * has ended — closes remaining open positions at the current market price,
 * computes final P/L%, and grades pass/fail against both required
 * thresholds (quiz >= 75%, trading P/L >= 5%).
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = user.email.toLowerCase().trim()

  const admin = createAdminClient()
  const { data: attempt } = await admin
    .from("cert_test_attempts")
    .select("id")
    .eq("client_email", email)
    .eq("status", "trading")
    .limit(1)
    .maybeSingle()
  if (!attempt) return NextResponse.json({ error: "No test in progress" }, { status: 404 })

  const result = await finalizeAttempt(attempt.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ attempt: result.attempt })
}
