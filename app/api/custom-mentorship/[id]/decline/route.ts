import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Declines a custom-mentorship request and tells the client why. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { reason } = await request.json().catch(() => ({ reason: "" }))

  const supabase = createAdminClient()
  const { data: req, error } = await supabase
    .from("custom_mentorship_requests")
    .select("id, full_name, email")
    .eq("id", id)
    .single()
  if (error || !req) return NextResponse.json({ error: "Request not found" }, { status: 404 })

  const note = typeof reason === "string" ? reason.trim().slice(0, 500) : ""

  await sendEmail({
    to: req.email,
    subject: "بخصوص طلب المنتورشيب المخصص",
    html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">مرحبًا ${req.full_name}،</h2>
        <p style="color: #ccc; line-height: 1.8;">
          شكرًا لاهتمامك بالمنتورشيب الفردي. للأسف لم نتمكن من قبول طلبك في الوقت الحالي.
        </p>
        ${note ? `<p style="color: #ccc; line-height: 1.8; border-right: 3px solid #d4a017; padding-right: 15px;">${note}</p>` : ""}
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          لو عندك أي استفسار، رد على هذا البريد وهنكون سعداء بمساعدتك.
        </p>
      </div>
    </div>`,
  })

  const { error: updateError } = await supabase
    .from("custom_mentorship_requests")
    .update({ status: "rejected", decline_reason: note || null, reviewed_at: new Date().toISOString() })
    .eq("id", id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
