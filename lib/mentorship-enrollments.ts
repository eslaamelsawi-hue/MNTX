import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"

export type MentorshipEnrollment = {
  id: string
  application_id: string | null
  email: string
  full_name: string
  coupon_code: string
  sessions: number
  total_amount: number
  split_first_amount: number | null
  split_second_amount: number | null
  status: "awaiting_payment" | "paid" | "cancelled"
  order_ref: string | null
  paid_at: string | null
}

/**
 * The approved applicant a checkout code belongs to. Payment routes use it to
 * record the order under the applicant's email, so the payment can always be
 * matched back to the application whatever was typed at checkout.
 */
export async function findEnrollmentByCoupon(code: unknown): Promise<MentorshipEnrollment | null> {
  if (typeof code !== "string" || !code.trim()) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("mentorship_enrollments")
    .select("*")
    .eq("coupon_code", code.trim().toUpperCase())
    .maybeSingle()
  return (data as MentorshipEnrollment | null) ?? null
}

/** The order an approved applicant still has to pay, if any. */
export async function findAwaitingEnrollment(email: string): Promise<MentorshipEnrollment | null> {
  const supabase = createAdminClient()
  // A missing table (migration 120 not yet run) reads as "no enrollment", so
  // every other coaching purchase keeps working exactly as before.
  const { data } = await supabase
    .from("mentorship_enrollments")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("status", "awaiting_payment")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MentorshipEnrollment | null) ?? null
}

/**
 * Marks an approved applicant's order paid, uses up their single-use code and
 * emails them how to reach the client dashboard. Safe to call twice: only the
 * call that moves the order out of awaiting_payment does anything.
 */
export async function completeEnrollment(enrollment: MentorshipEnrollment, orderRef: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: claimed } = await supabase
    .from("mentorship_enrollments")
    .update({ status: "paid", paid_at: new Date().toISOString(), order_ref: orderRef })
    .eq("id", enrollment.id)
    .eq("status", "awaiting_payment")
    .select("id")
    .maybeSingle()
  if (!claimed) return

  const { data: coupon } = await supabase
    .from("coupons")
    .select("used_count")
    .eq("code", enrollment.coupon_code)
    .maybeSingle()
  if (coupon) {
    await supabase
      .from("coupons")
      .update({ used_count: (coupon.used_count ?? 0) + 1 })
      .eq("code", enrollment.coupon_code)
  }

  const sent = await sendRegistrationEmail(enrollment)
  if (sent) {
    await supabase
      .from("mentorship_enrollments")
      .update({ register_email_sent_at: new Date().toISOString() })
      .eq("id", enrollment.id)
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

async function sendRegistrationEmail(enrollment: MentorshipEnrollment): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mentixtrading.com"
  const email = encodeURIComponent(enrollment.email)
  const registerUrl = `${baseUrl}/ar/register?email=${email}`
  const loginUrl = `${baseUrl}/ar/login?email=${email}`
  const split = enrollment.split_first_amount && enrollment.split_second_amount
    ? `<p style="color: #888; font-size: 13px; line-height: 1.6;">
        تبقّى عليك الدفعة الثانية بقيمة ${enrollment.split_second_amount}$ خلال 30 يومًا، وتظهر في لوحة التحكم.
      </p>`
    : ""

  const result = await sendEmail({
    to: enrollment.email,
    subject: "تم تفعيل المينتورشيب — سجّل في لوحة التحكم",
    html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">تم تأكيد الدفع وتفعيل المينتورشيب</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">مرحبًا ${escapeHtml(enrollment.full_name)}،</h2>
        <p style="color: #ccc; line-height: 1.8;">
          تم تأكيد دفعتك وتفعيل المينتورشيب الفردي. لديك الآن <strong style="color: #d4a017;">${enrollment.sessions} جلسات</strong>
          تحجزها من لوحة التحكم.
        </p>
        <p style="color: #ccc; line-height: 1.8;">
          أنشئ حسابك بنفس البريد الإلكتروني الذي دفعت به
          (<strong style="color: #f5f5f5;">${escapeHtml(enrollment.email)}</strong>) حتى تظهر جلساتك تلقائيًا.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${registerUrl}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            إنشاء حسابي في لوحة التحكم
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.6; text-align: center;">
          عندك حساب بالفعل؟ <a href="${loginUrl}" style="color: #d4a017;">سجّل الدخول من هنا</a>
        </p>
        ${split}
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`,
  })
  if (!result.success) console.error("[mentorship-enrollments] registration email failed:", result.error)
  return result.success
}
