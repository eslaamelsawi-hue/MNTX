import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"
import { generateCouponCode } from "@/lib/discount-offers"
import { getMentorshipPricing, MENTORSHIP_PLAN } from "@/lib/mentorship-pricing"
import { discountedPrice as computeDiscounted } from "@/lib/plan-pricing"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

const COUPON_EXPIRY_DAYS = 14

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  // An optional one-off discount for this applicant; without it they get the
  // rate configured in the dashboard.
  const body = await request.json().catch(() => ({}))
  const customPercent = body?.discountPercent
  const hasCustom = customPercent !== undefined && customPercent !== null && customPercent !== ""
  if (hasCustom) {
    const value = Number(customPercent)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return NextResponse.json({ error: "Custom discount must be between 0 and 100" }, { status: 400 })
    }
  }

  const supabase = createAdminClient()
  const { data: application, error: fetchError } = await supabase
    .from("mentorship_applications")
    .select("id, full_name, email, status")
    .eq("id", id)
    .single()
  if (fetchError || !application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const pricing = await getMentorshipPricing()
  const price = pricing.price
  const discountPercent = hasCustom ? Number(customPercent) : pricing.discountPercent
  const discountedPrice = computeDiscounted(price, discountPercent)
  const expiresAt = new Date(Date.now() + COUPON_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  let couponCode = generateCouponCode()
  let coupon = null
  let lastError: string | null = null
  for (let attempt = 0; attempt < 3 && !coupon; attempt++) {
    if (attempt > 0) couponCode = generateCouponCode()
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: couponCode,
        // Percent, not a fixed amount: the admin can change the mentorship
        // price later and an outstanding coupon still gives exactly the
        // advertised discount.
        discount_type: "percent",
        discount_value: discountPercent,
        max_uses: 1,
        applicable_plans: [MENTORSHIP_PLAN],
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single()
    if (data) coupon = data
    else lastError = error?.message ?? "Unknown error"
  }
  if (!coupon) return NextResponse.json({ error: lastError || "Failed to create coupon" }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mentixtrading.com"
  const checkoutUrl = `${baseUrl}/en/mentorship-checkout?code=${couponCode}&email=${encodeURIComponent(application.email)}`

  const emailResult = await sendEmail({
    to: application.email,
    subject: "تم قبولك في مينتورشيب Mentix الفردي 🎉",
    html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">تم قبول طلبك للمينتورشيب الفردي</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">مرحبًا ${application.full_name}،</h2>
        <p style="color: #ccc; line-height: 1.8;">
          تهانينا! راجعنا طلبك وتم قبولك في مينتورشيب Mentix الفردي 1-1. اضغط على الزر بالأسفل لإتمام
          التسجيل بدفعة واحدة كاملة بقيمة ${discountedPrice}$ (خصم ${discountPercent}% بدلاً من ${price}$).
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${checkoutUrl}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            إتمام التسجيل — ${discountedPrice}$
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          هذا الرابط مخصص لك ويعمل لمرة واحدة فقط، وصالح لمدة ${COUPON_EXPIRY_DAYS} يومًا. لو واجهت أي مشكلة
          في الدفع، تواصل معنا مباشرة.
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`,
  })
  if (!emailResult.success) {
    return NextResponse.json({ error: `Coupon created, but the email failed to send: ${emailResult.error}`, couponCode, checkoutUrl }, { status: 502 })
  }

  const { error: updateError } = await supabase
    .from("mentorship_applications")
    .update({ status: "approved", coupon_code: couponCode, checkout_url: checkoutUrl })
    .eq("id", id)
  if (updateError) console.error("[mentorship-applications/approve] failed to update status (email was still sent):", updateError)

  return NextResponse.json({ success: true, couponCode, checkoutUrl, price, discountPercent, discountedPrice })
}
