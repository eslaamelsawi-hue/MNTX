import { NextResponse } from "next/server"
import { createNowpaymentsInvoice } from "@/lib/nowpayments"

const PLAN_INFO: Record<string, { amount: number; description: string }> = {
  test:        { amount: 1,    description: "Mentix Trading - Test Plan" },
  "gold-pro":  { amount: 100,  description: "Mentix Trading - Gold Pro Monthly Analysis" },
  starter:     { amount: 199,  description: "Mentix Trading - ADVANCED SMC Course" },
  coaching:    { amount: 1599, description: "Mentix Trading - 1-on-1 Coaching Plan" },
  "extend-1m": { amount: 199,  description: "Mentix Trading - Mentorship Extension 1 Month" },
  "extend-2m": { amount: 379,  description: "Mentix Trading - Mentorship Extension 2 Months" },
  "extend-3m": { amount: 699,  description: "Mentix Trading - Mentorship Extension 3 Months" },
  "extend-6m": { amount: 1499, description: "Mentix Trading - Mentorship Extension 6 Months" },
}

export async function POST(request: Request) {
  try {
    const { plan, email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const planInfo = PLAN_INFO[plan]
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const orderId = `${plan}-${Date.now()}`

    const invoice = await createNowpaymentsInvoice({
      email,
      amount: Math.round(planInfo.amount * 1.005 * 100) / 100,
      description: planInfo.description,
      successUrl: `${baseUrl}/payment/success?provider=nowpayments&plan=${plan}`,
      cancelUrl: `${baseUrl}/#pricing`,
      orderId,
    })

    if (!invoice.invoice_url) {
      throw new Error("No payment URL returned from NowPayments")
    }

    return NextResponse.json({ url: invoice.invoice_url })
  } catch (error) {
    console.error("NowPayments error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    )
  }
}
