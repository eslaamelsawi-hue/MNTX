import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { QUIZ_PASS_PERCENT } from "@/lib/certification"

/** Quiz questions for the client to answer — correct_option is stripped. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: questions, error } = await admin
    .from("cert_quiz_questions")
    .select("id, question, option_a, option_b, option_c, option_d, order_index")
    .order("order_index", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: questions ?? [] })
}

/** Grades the submitted answers and stores the score on the client's
 *  in-progress attempt. Can be resubmitted any time before finalizing. */
export async function POST(request: NextRequest) {
  const { answers } = await request.json().catch(() => ({}))
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers object is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = user.email.toLowerCase().trim()

  const admin = createAdminClient()
  const { data: attempt } = await admin
    .from("cert_test_attempts")
    .select("id, status")
    .eq("client_email", email)
    .eq("status", "trading")
    .limit(1)
    .maybeSingle()
  if (!attempt) return NextResponse.json({ error: "No test in progress" }, { status: 404 })

  const { data: questions } = await admin.from("cert_quiz_questions").select("id, correct_option")
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: "No quiz questions have been set up yet" }, { status: 400 })
  }

  let correct = 0
  for (const q of questions) {
    if ((answers as Record<string, string>)[q.id] === q.correct_option) correct++
  }
  const scorePercent = Math.round((correct / questions.length) * 100)

  const { error } = await admin
    .from("cert_test_attempts")
    .update({ quiz_score_percent: scorePercent, quiz_answers: answers })
    .eq("id", attempt.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ scorePercent, correct, total: questions.length, passed: scorePercent >= QUIZ_PASS_PERCENT })
}
