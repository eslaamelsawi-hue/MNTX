import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason) return NextResponse.json({ error: "A decline reason is required" }, { status: 400 })

  const supabase = createAdminClient()
  const { data: application, error: fetchError } = await supabase
    .from("mentorship_applications")
    .select("id, full_name, email")
    .eq("id", id)
    .single()
  if (fetchError || !application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const emailResult = await sendEmail({
    to: application.email,
    subject: "بخصوص طلبك للانضمام إلى مينتورشيب Mentix",
    html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">مرحبًا ${application.full_name}،</h2>
        <p style="color: #ccc; line-height: 1.8;">
          شكرًا لاهتمامك بالانضمام إلى مينتورشيب Mentix الفردي. بعد مراجعة طلبك، لم نتمكن من قبولك في
          هذه الدفعة.
        </p>
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #d4a017;">
          <p style="margin: 0; color: #ccc; font-size: 14px;"><strong style="color: #f5f5f5;">السبب:</strong><br/>${escapeHtml(reason)}</p>
        </div>
        <p style="color: #888; font-size: 14px; line-height: 1.6;">
          يمكنك التقديم مرة أخرى في دفعة قادمة بعد العمل على النقاط المذكورة أعلاه.
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`,
  })
  if (!emailResult.success) {
    return NextResponse.json({ error: `Failed to send the decline email: ${emailResult.error}` }, { status: 502 })
  }

  const { error: updateError } = await supabase
    .from("mentorship_applications")
    .update({ status: "rejected", decline_reason: reason })
    .eq("id", id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
