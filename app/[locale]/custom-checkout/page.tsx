import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { CustomCheckout } from "@/components/custom-checkout"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "إتمام التسجيل | Mentix Trading",
  description: "أكمل تسجيلك في المنتورشيب المخصص.",
}

/**
 * The checkout an approved custom-mentorship request links to. Everything
 * that decides what gets charged — the price, the split, which payment
 * methods are offered — is read from the request row, never from the URL.
 */
export default async function CustomCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  if (!code) return <CustomCheckout error="رابط الدفع غير مكتمل." />

  const supabase = createAdminClient()
  const { data: req } = await supabase
    .from("custom_mentorship_requests")
    .select(
      "full_name, email, telegram_username, sessions, focus_areas, status, final_price, coupon_code, split_first_amount, split_second_amount"
    )
    .eq("coupon_code", code.toUpperCase().trim())
    .maybeSingle()

  if (!req) return <CustomCheckout error="رابط الدفع غير صالح." />
  if (req.status !== "approved") return <CustomCheckout error="هذا الرابط لم يعد صالحًا." />

  // A used-up or expired coupon means this link has already done its job.
  const { data: coupon } = await supabase
    .from("coupons")
    .select("max_uses, used_count, expires_at, is_active")
    .eq("code", req.coupon_code)
    .maybeSingle()

  if (!coupon?.is_active) return <CustomCheckout error="هذا الرابط لم يعد صالحًا." />
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return <CustomCheckout error="انتهت صلاحية رابط الدفع. تواصل معنا لإصدار رابط جديد." />
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return <CustomCheckout error="تم استخدام رابط الدفع هذا بالفعل." />
  }

  const { data: methodsRow } = await supabase
    .from("custom_mentorship_requests")
    .select("payment_methods")
    .eq("coupon_code", req.coupon_code)
    .maybeSingle()

  const split =
    req.split_first_amount && req.split_second_amount
      ? { firstAmount: Number(req.split_first_amount), secondAmount: Number(req.split_second_amount) }
      : null

  return (
    <CustomCheckout
      name={req.full_name}
      email={req.email}
      telegram={req.telegram_username ?? undefined}
      sessions={req.sessions}
      focusAreas={req.focus_areas ?? []}
      price={Number(req.final_price)}
      code={req.coupon_code}
      split={split}
      methods={(methodsRow?.payment_methods as string[]) ?? ["visa", "okx", "instapay"]}
    />
  )
}
