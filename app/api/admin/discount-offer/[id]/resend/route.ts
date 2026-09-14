import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendDiscountOfferEmail } from "@/lib/email"
import { PLAN_PRICES } from "@/lib/plan-pricing"
import { OFFER_PLAN_LABEL } from "@/lib/discount-offers"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Re-sends the same discount-offer email/coupon as a reminder — refreshes
 *  the coupon's expiry (and reactivates it if it had lapsed) rather than
 *  generating a new code, so it's still the exact offer the client already
 *  has in their inbox. Refuses to resend a code that's already been redeemed. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const expiryDays = Number(body.expiry_days) || 3

  const supabase = createAdminClient()
  const { data: offer } = await supabase.from("discount_offers").select("*").eq("id", id).single()
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

  const { data: coupon } = await supabase.from("coupons").select("*").eq("code", offer.coupon_code).single()
  if (!coupon) return NextResponse.json({ error: "The coupon for this offer no longer exists" }, { status: 404 })
  if ((coupon.used_count ?? 0) > 0) {
    return NextResponse.json({ error: "This code has already been redeemed — nothing to remind them about." }, { status: 400 })
  }

  const newExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const { error: couponError } = await supabase
    .from("coupons")
    .update({ expires_at: newExpiry.toISOString(), is_active: true })
    .eq("code", offer.coupon_code)
  if (couponError) return NextResponse.json({ error: couponError.message }, { status: 500 })

  const planInfo = PLAN_PRICES[offer.plan]
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mentixtrading.com"
  const emailResult = await sendDiscountOfferEmail({
    to: offer.client_email,
    planLabel: OFFER_PLAN_LABEL,
    originalPrice: planInfo?.amount ?? 0,
    discountPercent: offer.discount_percent,
    couponCode: offer.coupon_code,
    expiresAt: newExpiry.toISOString(),
    checkoutUrl: `${baseUrl}/en/checkout?plan=${offer.plan}`,
  })
  if (!emailResult.success) {
    return NextResponse.json({ error: `Reminder email failed to send: ${emailResult.error}` }, { status: 502 })
  }

  const { data: updated, error } = await supabase
    .from("discount_offers")
    .update({ sent_at: new Date().toISOString(), expires_at: newExpiry.toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, offer: updated })
}
