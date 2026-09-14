import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendDiscountOfferEmail } from "@/lib/email"
import { PLAN_PRICES } from "@/lib/plan-pricing"
import { OFFER_PLAN, OFFER_PLAN_LABEL, generateCouponCode } from "@/lib/discount-offers"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data: offers, error } = await supabase
    .from("discount_offers")
    .select("*")
    .order("sent_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const codes = (offers ?? []).map((o) => o.coupon_code)
  const { data: coupons } = codes.length > 0 ? await supabase.from("coupons").select("code, used_count, is_active").in("code", codes) : { data: [] }
  const couponByCode = new Map((coupons ?? []).map((c) => [c.code, c]))

  const enriched = (offers ?? []).map((o) => {
    const coupon = couponByCode.get(o.coupon_code)
    const redeemed = (coupon?.used_count ?? 0) > 0
    const expired = !redeemed && new Date(o.expires_at) < new Date()
    return { ...o, status: redeemed ? "redeemed" : expired ? "expired" : "active" }
  })

  return NextResponse.json({ offers: enriched })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = typeof body.client_email === "string" ? body.client_email.trim().toLowerCase() : ""
  const discountPercent = Number(body.discount_percent) || 40
  const expiryDays = Number(body.expiry_days) || 3

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid client email is required" }, { status: 400 })
  }
  if (discountPercent < 1 || discountPercent > 100) {
    return NextResponse.json({ error: "Discount percent must be between 1 and 100" }, { status: 400 })
  }
  if (expiryDays < 1) {
    return NextResponse.json({ error: "Expiry must be at least 1 day" }, { status: 400 })
  }

  const planInfo = PLAN_PRICES[OFFER_PLAN]
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const supabase = createAdminClient()

  let couponCode = generateCouponCode()
  let coupon = null
  let lastError: string | null = null
  for (let attempt = 0; attempt < 3 && !coupon; attempt++) {
    if (attempt > 0) couponCode = generateCouponCode()
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: couponCode,
        discount_type: "percent",
        discount_value: discountPercent,
        max_uses: 1,
        applicable_plans: [OFFER_PLAN],
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single()
    if (data) coupon = data
    else lastError = error?.message ?? "Unknown error"
  }
  if (!coupon) {
    return NextResponse.json({ error: lastError || "Failed to create coupon" }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mentixtrading.com"
  const emailResult = await sendDiscountOfferEmail({
    to: email,
    planLabel: OFFER_PLAN_LABEL,
    originalPrice: planInfo.amount,
    discountPercent,
    couponCode,
    expiresAt: expiresAt.toISOString(),
    checkoutUrl: `${baseUrl}/en/checkout?plan=${OFFER_PLAN}`,
  })
  if (!emailResult.success) {
    // Coupon is still created and usable — just flag the email didn't go out.
    return NextResponse.json({ error: `Coupon created, but the email failed to send: ${emailResult.error}`, couponCode }, { status: 502 })
  }

  const { data: offer, error: offerError } = await supabase
    .from("discount_offers")
    .insert({
      client_email: email,
      coupon_code: couponCode,
      plan: OFFER_PLAN,
      discount_percent: discountPercent,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()
  if (offerError) console.error("[admin/discount-offer] failed to log offer (email was still sent):", offerError)

  return NextResponse.json({ success: true, offer, couponCode })
}

/** Deletes a sent offer AND revokes its coupon, so the code stops working —
 *  deleting is meant to fully retract the discount, not just hide it from the list. */
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const supabase = createAdminClient()
  const { data: offer } = await supabase.from("discount_offers").select("coupon_code").eq("id", id).single()
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

  const { error: couponError } = await supabase.from("coupons").delete().eq("code", offer.coupon_code)
  if (couponError) console.error("[admin/discount-offer] failed to delete coupon (offer still removed):", couponError)

  const { error } = await supabase.from("discount_offers").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
