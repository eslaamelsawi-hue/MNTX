import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const mentorId = req.nextUrl.searchParams.get("mentor_id")
  const studentEmail = req.nextUrl.searchParams.get("student_email")

  if (!mentorId || !studentEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get or create conversation
  let { data: conversation } = await supabase
    .from("dm_conversations")
    .select("*")
    .eq("mentor_id", mentorId)
    .eq("student_email", studentEmail.toLowerCase().trim())
    .single()

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("dm_conversations")
      .insert({ mentor_id: mentorId, student_email: studentEmail.toLowerCase().trim() })
      .select()
      .single()
    conversation = newConv
  }

  // Get messages
  const { data: messages } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })

  return NextResponse.json({ conversation, messages })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { conversation_id, sender_email, message } = body

  if (!conversation_id || !sender_email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id,
      sender_email: sender_email.toLowerCase().trim(),
      message,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: data })
}
