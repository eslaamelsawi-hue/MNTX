import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"
import { getApprovedSeatsStatus } from "@/lib/mentorship-seats"
import { getMentorshipPricing } from "@/lib/mentorship-pricing"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

const REQUIRED_FIELDS = ["full_name", "email", "whatsapp", "telegram_username", "country"] as const

function adminNotificationHtml(a: Record<string, unknown>): string {
  const row = (label: string, value: unknown) =>
    value === null || value === undefined || value === ""
      ? ""
      : `<p style="margin:6px 0;color:#ccc;"><strong style="color:#f5f5f5;">${label}:</strong> ${String(value)}</p>`

  return `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
      <h1 style="color: #d4a017; margin: 0;">New Mentorship Application</h1>
      <p style="color: #888; margin: 5px 0 0;">1-on-1 Coaching — review it in the admin dashboard</p>
    </div>
    <div style="padding: 24px 0;">
      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; border-left: 4px solid #d4a017; margin-bottom: 16px;">
        ${row("Name", a.full_name)}
        ${row("Email", a.email)}
        ${row("WhatsApp", a.whatsapp)}
        ${row("Age", a.age)}
        ${row("Telegram", a.telegram_username)}
        ${row("Instagram", a.instagram)}
        ${row("Country", a.country)}
      </div>
      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; border-left: 4px solid #333; margin-bottom: 16px;">
        ${row("Current job", a.current_job)}
        ${row("Hours/day for trading", a.hours_per_day)}
        ${row("Taught by", a.taught_by)}
        ${row("Market experience", a.market_experience)}
        ${row("Learning duration", a.learning_duration)}
        ${row("Tried funded account", a.tried_funded_account === true ? "Yes" : a.tried_funded_account === false ? "No" : "")}
        ${row("Passed funded account", a.passed_funded_account === true ? "Yes" : a.passed_funded_account === false ? "No" : "")}
        ${row("Past losses", a.past_losses)}
      </div>
      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; border-left: 4px solid #333; margin-bottom: 16px;">
        ${row("Why join", a.why_join)}
        ${row("Top mistakes", a.top_mistakes)}
        ${row("Loss reason (opinion)", a.loss_reason_opinion)}
        ${row("3 losses in a row — reaction", a.three_losses_reaction)}
        ${row("Can attend live", a.can_attend_live === true ? "Yes" : a.can_attend_live === false ? "No" : "")}
        ${row("Can dedicate weekly time", a.can_dedicate_weekly_time === true ? "Yes" : a.can_dedicate_weekly_time === false ? "No" : "")}
        ${row("Commitment (1-10)", a.commitment_rating)}
        ${row("What differentiates them", a.what_differentiates)}
        ${row("Paid courses before", a.paid_courses_before)}
      </div>
      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; border-left: 4px solid #333;">
        ${row("Investment range", a.investment_range)}
        ${row("Why this number", a.investment_reason)}
      </div>
    </div>
  </div>`
}

export async function POST(request: NextRequest) {
  try {
    const { seatsFull } = await getApprovedSeatsStatus()
    if (seatsFull) {
      return NextResponse.json({ error: "عذرًا، اكتمل عدد المقاعد لهذه الدفعة. تابعنا لمعرفة موعد فتح الدفعة القادمة." }, { status: 400 })
    }

    const body = await request.json()

    for (const field of REQUIRED_FIELDS) {
      if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }
    if (!body.email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }
    if (!body.terms_accepted) {
      return NextResponse.json({ error: "You must accept the terms and conditions" }, { status: 400 })
    }

    const record = {
      full_name: String(body.full_name).trim(),
      email: String(body.email).trim().toLowerCase(),
      whatsapp: String(body.whatsapp).trim(),
      age: body.age ? Number(body.age) || null : null,
      telegram_username: String(body.telegram_username).trim(),
      instagram: body.instagram ? String(body.instagram).trim() : null,
      country: String(body.country).trim(),

      current_job: body.current_job ? String(body.current_job).trim() : null,
      hours_per_day: body.hours_per_day ? String(body.hours_per_day).trim() : null,
      taught_by: body.taught_by ? String(body.taught_by).trim() : null,
      market_experience: body.market_experience ?? null,
      learning_duration: body.learning_duration ?? null,
      tried_funded_account: typeof body.tried_funded_account === "boolean" ? body.tried_funded_account : null,
      passed_funded_account: typeof body.passed_funded_account === "boolean" ? body.passed_funded_account : null,
      past_losses: body.past_losses ? String(body.past_losses).trim() : null,

      why_join: body.why_join ? String(body.why_join).trim() : null,
      top_mistakes: body.top_mistakes ? String(body.top_mistakes).trim() : null,
      loss_reason_opinion: body.loss_reason_opinion ? String(body.loss_reason_opinion).trim() : null,
      three_losses_reaction: body.three_losses_reaction ? String(body.three_losses_reaction).trim() : null,
      can_attend_live: typeof body.can_attend_live === "boolean" ? body.can_attend_live : null,
      can_dedicate_weekly_time: typeof body.can_dedicate_weekly_time === "boolean" ? body.can_dedicate_weekly_time : null,
      commitment_rating: body.commitment_rating ? Number(body.commitment_rating) || null : null,
      what_differentiates: body.what_differentiates ? String(body.what_differentiates).trim() : null,
      paid_courses_before: body.paid_courses_before ? String(body.paid_courses_before).trim() : null,

      investment_range: body.investment_range ?? null,
      investment_reason: body.investment_reason ? String(body.investment_reason).trim() : null,

      terms_accepted: true,
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.from("mentorship_applications").insert(record).select("id").single()
    if (error) {
      console.error("[mentorship-applications] insert failed:", error)
      return NextResponse.json({ error: "Failed to save your application. Please try again." }, { status: 500 })
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com"
    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `New mentorship application: ${record.full_name}`,
      html: adminNotificationHtml(record),
    })
    if (!adminResult.success) {
      console.error("[mentorship-applications] admin alert failed (application still saved):", adminResult.error)
    }

    const { discountPercent } = await getMentorshipPricing()
    const clientResult = await sendEmail({
      to: record.email,
      subject: "We've received your mentorship application",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
          <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
          <p style="color: #888; margin: 5px 0 0;">Mentorship Application Received</p>
        </div>
        <div style="padding: 30px 0;">
          <h2 style="color: #f5f5f5;">Hello ${record.full_name},</h2>
          <p style="color: #ccc; line-height: 1.6;">
            Thanks for applying to the 1-on-1 Coaching Mentorship. We're reviewing your application now and will reach out
            on WhatsApp or Telegram within a few days to confirm the next steps and your ${discountPercent}% discount.
          </p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
        </div>
      </div>`,
    })
    if (!clientResult.success) {
      console.error("[mentorship-applications] applicant ack failed (application still saved):", clientResult.error)
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error("[mentorship-applications] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("mentorship_applications")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach the discount each approved applicant was actually given, read off
  // their coupon — so a one-off rate is still visible after a refresh without
  // storing it twice.
  const codes = (data ?? []).map((a) => a.coupon_code).filter(Boolean) as string[]
  const { data: coupons } = codes.length
    ? await supabase.from("coupons").select("code, discount_type, discount_value").in("code", codes)
    : { data: [] as { code: string; discount_type: string; discount_value: number }[] }
  const byCode = new Map((coupons ?? []).map((c) => [c.code, c]))

  const applications = (data ?? []).map((a) => {
    const coupon = a.coupon_code ? byCode.get(a.coupon_code) : undefined
    return {
      ...a,
      granted_discount_percent: coupon?.discount_type === "percent" ? Number(coupon.discount_value) : null,
    }
  })

  return NextResponse.json({ applications })
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, status, admin_notes } = await request.json()
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (status) {
    if (!["new", "reviewed", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    update.status = status
  }
  if (typeof admin_notes === "string") update.admin_notes = admin_notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("mentorship_applications").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
