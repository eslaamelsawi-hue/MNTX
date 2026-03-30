import { NextResponse } from "next/server"
import crypto from "crypto"
import { createOrder } from "@/lib/okx-orders"
import { createAdminClient } from "@/lib/supabase/admin"

const OKX_API_BASE = "https://www.okx.com"

const PLAN_PRICES: Record<string, { amount: number; description: string }> = {
  test:        { amount: 1,    description: "Mentix Trading - Test Plan" },
  "gold-pro":  { amount: 100, description: "Mentix Trading - Gold Pro Monthly Analysis" },
  starter:     { amount: 379,  description: "Mentix Trading - ADVANCED SMC Course" },
  coaching:    { amount: 1599, description: "Mentix Trading - 1-on-1 Coaching Plan" },
  "extend-1m": { amount: 199,  description: "Mentix Trading - Mentorship Extension 1 Month" },
  "extend-2m": { amount: 379,  description: "Mentix Trading - Mentorship Extension 2 Months" },
  "extend-3m": { amount: 699,  description: "Mentix Trading - Mentorship Extension 3 Months" },
  "extend-6m": { amount: 1499, description: "Mentix Trading - Mentorship Extension 6 Months" },
}

async function applyCouponDiscount(code: string, plan: string, amountDollars: number): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single()

    if (error || !coupon) return amountDollars
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return amountDollars
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return amountDollars
    if (coupon.applicable_plans?.length > 0 && !coupon.applicable_plans.includes(plan)) return amountDollars

    let discountDollars: number
    if (coupon.discount_type === "percent") {
      discountDollars = Math.round(amountDollars * (coupon.discount_value / 100) * 100) / 100
    } else {
      discountDollars = coupon.discount_value
    }
    return Math.max(0, Math.round((amountDollars - discountDollars) * 100) / 100)
  } catch {
    return amountDollars
  }
}

function generateSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secretKey: string
): string {
  const prehash = `${timestamp}${method}${requestPath}${body}`
  return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64")
}

export async function POST(request: Request) {
  try {
    const { plan, email, couponCode } = await request.json()

    const accessKey = process.env.OKX_ACCESS_KEY
    const secretKey = process.env.OKX_SECRET_KEY
    const passphrase = process.env.OKX_PASSPHRASE || ""

    if (!accessKey || !secretKey) {
      return NextResponse.json({ error: "OKX Pay is not configured." }, { status: 500 })
    }

    const planInfo = PLAN_PRICES[plan]
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Fetch USDT deposit address from OKX
    const endpoint = "/api/v5/asset/deposit-address?ccy=USDT"
    const timestamp = new Date().toISOString()
    const signature = generateSignature(timestamp, "GET", endpoint, "", secretKey)

    const response = await fetch(`${OKX_API_BASE}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": accessKey,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": passphrase,
      },
    })

    const data = await response.json()

    if (data.code !== "0" || !data.data?.length) {
      return NextResponse.json(
        { error: `OKX error: ${data.msg || "Could not fetch deposit address"}` },
        { status: 400 }
      )
    }

    // Prefer TRC20 (low fees), fallback to first available
    const trc20 = data.data.find((d: { chain: string }) => d.chain === "USDT-TRC20")
    const entry = trc20 || data.data[0]

    const orderId = `MENTIX${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Apply coupon discount if provided
    let finalAmount = planInfo.amount
    if (couponCode && typeof couponCode === "string") {
      finalAmount = await applyCouponDiscount(couponCode, plan, planInfo.amount)
    }
    const finalAmountStr = String(finalAmount)

    // Store the pending order
    await createOrder({
      orderId,
      plan,
      amount: finalAmountStr,
      email,
      address: entry.addr,
      chain: entry.chain,
      status: "pending",
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      orderId,
      address: entry.addr,
      chain: entry.chain,
      amount: finalAmountStr,
      currency: "USDT",
      description: planInfo.description,
    })
  } catch (error) {
    console.error("OKX Pay error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
