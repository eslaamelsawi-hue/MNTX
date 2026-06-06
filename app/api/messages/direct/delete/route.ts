import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversation_id")

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Delete all messages in the conversation first
  const { error: messagesError } = await supabase
    .from("dm_messages")
    .delete()
    .eq("conversation_id", conversationId)

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 })
  }

  // Delete the conversation
  const { error: conversationError } = await supabase
    .from("dm_conversations")
    .delete()
    .eq("id", conversationId)

  if (conversationError) {
    return NextResponse.json({ error: conversationError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
