import { NextResponse } from "next/server"
import { createNowpaymentsInvoice } from "@/lib/nowpayments"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, locale } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const orderId = `gold-pro-${email}-${Date.now()}`
    const successUrl = `${baseUrl}/${locale || "en"}/payment/success?plan=gold-pro&order=${orderId}`
    const cancelUrl = `${baseUrl}/${locale || "en"}/gold-pro?canceled=true`

    const invoice = await createNowpaymentsInvoice({
      email,
      amount: 100,
      description: "Mentix Gold Pro - Monthly Analysis",
      successUrl,
      cancelUrl,
      orderId,
    })

    const paymentUrl = invoice.invoice_url
    if (!paymentUrl) {
      throw new Error("No payment URL returned from Nowpayments")
    }

    return NextResponse.json({ url: paymentUrl })
  } catch (error) {
    console.error("Gold Pro subscription error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subscription" },
      { status: 500 }
    )
  }
}