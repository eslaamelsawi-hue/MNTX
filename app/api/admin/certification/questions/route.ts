import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("cert_quiz_questions").select("*").order("order_index", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { question, option_a, option_b, option_c, option_d, correct_option } = body
  if (!question || !option_a || !option_b || !option_c || !option_d || !["a", "b", "c", "d"].includes(correct_option)) {
    return NextResponse.json({ error: "All fields and a valid correct_option (a-d) are required" }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { count } = await supabase.from("cert_quiz_questions").select("id", { count: "exact", head: true })
  const { data, error } = await supabase
    .from("cert_quiz_questions")
    .insert({ question, option_a, option_b, option_c, option_d, correct_option, order_index: count ?? 0 })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from("cert_quiz_questions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
