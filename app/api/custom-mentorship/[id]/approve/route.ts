import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend-send"
import { generateCouponCode } from "@/lib/discount-offers"
import { customMentorshipPrice } from "@/lib/plan-pricing"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

const COUPON_EXPIRY_DAYS = 14
const METHODS = ["visa", "okx", "instapay"] as const
const METHOD_LABELS: Record<string, string> = { visa: "فيزا / ماستركارد", okx: "عملات رقمية (OKX)", instapay: "إنستاباي" }

/**
 * Approves a custom-mentorship request: mints a single-use coupon for the
 * difference between the quoted price and whatever the admin settled on, and
 * emails the client a checkout link limited to the chosen payment methods.
 *
 * The discount is stored as a fixed amount rather than a percentage because
 * the admin sets a target price here, and a percentage would drift if the
 * session rates ever change while the link is outstanding.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const supabase = createAdminClient()
  const { data: req, error: fetchError } = await supabase
    .from("custom_mentorship_requests")
    .select("id, full_name, email, sessions, quoted_price, status")
    .eq("id", id)
    .single()
  if (fetchError || !req) return NextResponse.json({ error: "Request not found" }, { status: 404 })

  // The plan's list price is what checkout starts from; the coupon brings it
  // down to the agreed figure.
  const plan = `mentorship-custom-${req.sessions}`
  const listPrice = customMentorshipPrice(req.sessions)

  const finalPrice = body?.finalPrice === undefined || body.finalPrice === "" ? listPrice : Number(body.finalPrice)
  if (!Number.isFinite(finalPrice) || finalPrice <= 0 || finalPrice > listPrice) {
    return NextResponse.json(
      { error: `Final price must be between $1 and the list price of $${listPrice}` },
      { status: 400 }
    )
  }

  const methods = Array.isArray(body?.paymentMethods)
    ? body.paymentMethods.filter((m: unknown) => METHODS.includes(m as (typeof METHODS)[number]))
    : [...METHODS]
  if (methods.length === 0) {
    return NextResponse.json({ error: "Choose at least one payment method" }, { status: 400 })
  }

  // Optional two-payment plan. Validated against the agreed total so the
  // instalments can't quietly add up to something else.
  let split: { firstAmount: number; secondAmount: number } | null = null
  if (body?.split) {
    const first = Number(body.split.firstAmount)
    const second = Number(body.split.secondAmount)
    if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0 || second <= 0) {
      return NextResponse.json({ error: "Both payments must be greater than 0" }, { status: 400 })
    }
    if (Math.abs(first + second - finalPrice) > 0.01) {
      return NextResponse.json({ error: `The two payments must add up to $${finalPrice}` }, { status: 400 })
    }
    split = { firstAmount: first, secondAmount: second }
  }

  // Zero when the admin approves at the quoted price. The coupon is created
  // either way: it's what the checkout link is keyed on, and what makes that
  // link single-use and expiring.
  const discount = Math.round((listPrice - finalPrice) * 100) / 100
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
        discount_type: "fixed",
        discount_value: discount,
        max_uses: 1,
        applicable_plans: [plan],
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
  const checkoutUrl = `${baseUrl}/ar/custom-checkout?code=${couponCode}`

  const payLine = split
    ? `على دفعتين: ${split.firstAmount}$ الآن، و${split.secondAmount}$ خلال 30 يومًا`
    : `بدفعة واحدة بقيمة ${finalPrice}$`
  const methodLine = methods.map((m: string) => METHOD_LABELS[m]).join(" · ")

  const emailResult = await sendEmail({
    to: req.email,
    subject: "تمت الموافقة على منتورشيبك المخصص 🎉",
    html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">تمت الموافقة على طلبك</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">مرحبًا ${req.full_name}،</h2>
        <p style="color: #ccc; line-height: 1.8;">
          راجعنا المنتورشيب الذي صمّمته (${req.sessions} ${req.sessions === 1 ? "جلسة" : "جلسات"} فردية)
          وتمت الموافقة عليه. تقدر تكمل التسجيل ${payLine}.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${checkoutUrl}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
            إتمام التسجيل — ${split ? `${split.firstAmount}$ الآن` : `${finalPrice}$`}
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          طرق الدفع المتاحة: ${methodLine}.<br>
          هذا الرابط مخصص لك ويعمل لمرة واحدة فقط، وصالح لمدة ${COUPON_EXPIRY_DAYS} يومًا.
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`,
  })
  if (!emailResult.success) {
    return NextResponse.json(
      { error: `Coupon created, but the email failed to send: ${emailResult.error}`, couponCode, checkoutUrl },
      { status: 502 }
    )
  }

  const { error: updateError } = await supabase
    .from("custom_mentorship_requests")
    .update({
      status: "approved",
      final_price: finalPrice,
      coupon_code: couponCode,
      checkout_url: checkoutUrl,
      split_first_amount: split?.firstAmount ?? null,
      split_second_amount: split?.secondAmount ?? null,
      payment_methods: methods,
      admin_notes: typeof body?.notes === "string" ? body.notes.slice(0, 500) : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (updateError) {
    console.error("[custom-mentorship/approve] status update failed (email was sent):", updateError)
  }

  return NextResponse.json({ success: true, couponCode, checkoutUrl, listPrice, finalPrice, split, methods })
}
