import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Get all conversations for a mentor
export async function GET(req: NextRequest) {
  const mentorId = req.nextUrl.searchParams.get("mentor_id")

  if (!mentorId) {
    return NextResponse.json({ error: "mentor_id is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: conversations, error } = await supabase
    .from("dm_conversations")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations })
}
