import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"
import { generateCouponCode } from "@/lib/discount-offers"
import { getMentorshipPricing, MENTORSHIP_PLAN } from "@/lib/mentorship-pricing"
import { discountedPrice as computeDiscounted } from "@/lib/plan-pricing"
import { MENTORSHIP_SESSIONS, MENTORSHIP_SESSIONS_MAX } from "@/lib/mentorship-sessions"

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

  // How many live sessions this applicant gets — the standard package unless
  // the admin set a different number when approving.
  const rawSessions = body?.sessions
  const sessions =
    rawSessions === undefined || rawSessions === null || rawSessions === "" ? MENTORSHIP_SESSIONS : Number(rawSessions)
  if (!Number.isInteger(sessions) || sessions < 1 || sessions > MENTORSHIP_SESSIONS_MAX) {
    return NextResponse.json(
      { error: `Sessions must be a whole number between 1 and ${MENTORSHIP_SESSIONS_MAX}` },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data: application, error: fetchError } = await supabase
    .from("mentorship_applications")
    .select("id, full_name, email, status")
    .eq("id", id)
    .single()
  if (fetchError || !application) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  // Approval is final: a second approval would mint a second link for the
  // same seat.
  if (application.status === "approved") {
    return NextResponse.json({ error: "This application is already approved." }, { status: 409 })
  }

  // Optional two-payment plan, with amounts the admin sets. Validated
  // against the discounted total so the instalments can't silently add up to
  // something else.
  const rawSplit = body?.split
  let split: { firstAmount: number; secondAmount: number } | null = null

  const pricing = await getMentorshipPricing()
  const price = pricing.price
  const discountPercent = hasCustom ? Number(customPercent) : pricing.discountPercent
  const discountedPrice = computeDiscounted(price, discountPercent)

  if (rawSplit) {
    const first = Number(rawSplit.firstAmount)
    const second = Number(rawSplit.secondAmount)
    if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0 || second <= 0) {
      return NextResponse.json({ error: "Both payments must be greater than 0" }, { status: 400 })
    }
    if (Math.abs(first + second - discountedPrice) > 0.01) {
      return NextResponse.json(
        { error: `The two payments must add up to $${discountedPrice}` },
        { status: 400 }
      )
    }
    // Whop bills the up-front fee on top of the first renewal, so it can only
    // take the second payment automatically when the first is the larger one.
    // Mentorship checkout always offers Visa, so refuse the reverse rather
    // than send a link whose balance would have to be chased by hand.
    if (first < second) {
      return NextResponse.json(
        {
          error: `For the second payment to be charged automatically, the first payment must be the larger one. Try $${second} now and $${first} in 30 days.`,
        },
        { status: 400 }
      )
    }
    split = { firstAmount: first, secondAmount: second }
  }
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

  // Everything is saved before the email goes out. The checkout page reads
  // the split from this row, so a link sent after a failed save would charge
  // the wrong amount — that is how a split approval once went out as full.
  const undoCoupon = () => supabase.from("coupons").update({ is_active: false }).eq("code", couponCode)

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("mentorship_enrollments")
    .insert({
      application_id: application.id,
      email: application.email.toLowerCase().trim(),
      full_name: application.full_name,
      coupon_code: couponCode,
      checkout_url: checkoutUrl,
      sessions,
      total_amount: discountedPrice,
      split_first_amount: split?.firstAmount ?? null,
      split_second_amount: split?.secondAmount ?? null,
    })
    .select("id")
    .single()
  if (enrollmentError || !enrollment) {
    await undoCoupon()
    console.error("[mentorship-applications/approve] order not created:", enrollmentError)
    return NextResponse.json(
      { error: `Nothing was sent: the order couldn't be created (${enrollmentError?.message ?? "unknown error"}). Run scripts/120_mentorship_enrollments.sql in Supabase.` },
      { status: 500 }
    )
  }

  const { error: updateError } = await supabase
    .from("mentorship_applications")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      coupon_code: couponCode,
      checkout_url: checkoutUrl,
      split_first_amount: split?.firstAmount ?? null,
      split_second_amount: split?.secondAmount ?? null,
    })
    .eq("id", id)
    .neq("status", "approved")
  if (updateError) {
    await supabase.from("mentorship_enrollments").delete().eq("id", enrollment.id)
    await undoCoupon()
    console.error("[mentorship-applications/approve] approval not saved:", updateError)
    return NextResponse.json(
      { error: `Nothing was sent: the approval couldn't be saved (${updateError.message}). Run scripts/120_mentorship_enrollments.sql in Supabase.` },
      { status: 500 }
    )
  }

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
          التسجيل${split
            ? ` على دفعتين: ${split.firstAmount}$ الآن، و${split.secondAmount}$ خلال 30 يومًا`
            : ` بدفعة واحدة كاملة بقيمة ${discountedPrice}$`} (خصم ${discountPercent}% بدلاً من ${price}$).
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${checkoutUrl}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            إتمام التسجيل — ${split ? `${split.firstAmount}$ الآن` : `${discountedPrice}$`}
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
    // The approval and order stand; only the email is missing, so the admin
    // can copy the link and send it directly.
    return NextResponse.json(
      { error: `Approved, but the email failed to send: ${emailResult.error}. Copy the checkout link and send it yourself.`, couponCode, checkoutUrl },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true, couponCode, checkoutUrl, price, discountPercent, discountedPrice, split })
}
