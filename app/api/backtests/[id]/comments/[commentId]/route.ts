import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** A client can delete their own comment; an admin can delete anyone's. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params

  const cookieStore = await cookies()
  const isAdmin = !!cookieStore.get("admin_session")?.value

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase().trim() ?? null

  if (!isAdmin && !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: comment } = await admin
    .from("backtest_comments")
    .select("client_email")
    .eq("id", commentId)
    .eq("backtest_id", id)
    .single()
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!isAdmin && comment.client_email !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await admin.from("backtest_comments").delete().eq("id", commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
