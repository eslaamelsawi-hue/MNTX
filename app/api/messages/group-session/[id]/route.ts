import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const messageId = params.id

  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from("group_chat_messages")
    .delete()
    .eq("id", messageId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
