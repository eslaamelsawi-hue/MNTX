import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isEligibleForCertTest, STARTING_BALANCE, TEST_DURATION_DAYS } from "@/lib/certification"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const email = user.email.toLowerCase().trim()
  const name = (user.user_metadata?.first_name || user.user_metadata?.full_name || email.split("@")[0]) as string

  if (!(await isEligibleForCertTest(email))) {
    return NextResponse.json({ error: "This test is only available to clients who've completed 1-on-1 coaching." }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("cert_test_attempts")
    .select("id")
    .eq("client_email", email)
    .eq("status", "trading")
    .limit(1)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: "You already have a test in progress." }, { status: 400 })
  }

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + TEST_DURATION_DAYS * 24 * 60 * 60 * 1000)

  const { data: attempt, error } = await admin
    .from("cert_test_attempts")
    .insert({
      client_email: email,
      client_name: name,
      starting_balance: STARTING_BALANCE,
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attempt })
}
