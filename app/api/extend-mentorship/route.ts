import { NextResponse } from "next/server"
import { createNowpaymentsInvoice } from "@/lib/nowpayments"
import { createClient } from "@/lib/supabase/server"

const PLANS: Record<string, { amount: number; label: string }> = {
  "extend-1m": { amount: 250, label: "Mentix Mentorship Extension – 1 Month" },
  "extend-2m": { amount: 449, label: "Mentix Mentorship Extension – 2 Months" },
  "extend-3m": { amount: 900, label: "Mentix Mentorship Extension – 3 Months" },
  "extend-6m": { amount: 1499, label: "Mentix Mentorship Extension – 6 Months" },
}

export async function POST(request: Request) {
  try {
    const { planId, locale, name, email, telegram } = await request.json()

    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const orderId = `${planId}-${Date.now()}`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // Save lead to Supabase
    try {
      const supabase = await createClient()
      await supabase.from("extend_requests").insert({
        order_id: orderId,
        plan_id: planId,
        name,
        email,
        telegram,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Non-fatal — proceed to payment even if DB save fails
    }

    // Notify Discord
    try {
      await fetch("https://discord.com/api/webhooks/1486933678037798949/v0nNdHHoP2N8G36qUvaBJ-EUb97P2sQCwOECR-3ZGbVQPLqgTQox3vT0ziz010iUmaYv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🔔 New Mentorship Extension Request",
              color: 0xf5a623,
              fields: [
                { name: "👤 Name", value: name, inline: true },
                { name: "📧 Email", value: email, inline: true },
                { name: "✈️ Telegram", value: `@${telegram}`, inline: true },
                { name: "📦 Plan", value: plan.label, inline: true },
                { name: "💰 Amount", value: `$${plan.amount}`, inline: true },
                { name: "🆔 Order ID", value: orderId, inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      })
    } catch {
      // Non-fatal — proceed to payment even if Discord notify fails
    }

    const invoice = await createNowpaymentsInvoice({
      email,
      customerEmail: email,
      amount: plan.amount,
      description: `${plan.label} | ${name} | @${telegram}`,
      successUrl: `${baseUrl}/${locale || "en"}/extend?success=true`,
      cancelUrl: `${baseUrl}/${locale || "en"}/extend?canceled=true`,
      orderId,
    })

    if (!invoice.invoice_url) {
      throw new Error("No payment URL returned from Nowpayments")
    }

    return NextResponse.json({ url: invoice.invoice_url })
  } catch (error) {
    console.error("Extend mentorship payment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    )
  }
}
