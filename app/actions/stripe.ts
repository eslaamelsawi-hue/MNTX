"use server"

import { stripe } from "@/lib/stripe"
import { PRODUCTS } from "@/lib/products"
import { createAdminClient } from "@/lib/supabase/admin"

async function validateCouponServer(code: string, plan: string, priceInCents: number) {
  const supabase = createAdminClient()
  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .single()

  if (error || !coupon) return 0
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return 0
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return 0
  if (coupon.applicable_plans?.length > 0 && !coupon.applicable_plans.includes(plan)) return 0
  if (coupon.min_order_cents && priceInCents < coupon.min_order_cents) return 0

  let discountCents: number
  if (coupon.discount_type === "percent") {
    discountCents = Math.round(priceInCents * (coupon.discount_value / 100))
  } else {
    discountCents = Math.round(coupon.discount_value * 100)
  }
  return Math.min(discountCents, priceInCents)
}

export async function startCheckoutSession(productId: string, couponCode?: string) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  let finalAmount = product.priceInCents
  if (couponCode) {
    const discountCents = await validateCouponServer(couponCode, productId, product.priceInCents)
    finalAmount = Math.max(0, product.priceInCents - discountCents)
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: finalAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
  })

  return session.client_secret
}
