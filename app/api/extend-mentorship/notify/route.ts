import { NextResponse } from "next/server"

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1486933678037798949/v0nNdHHoP2N8G36qUvaBJ-EUb97P2sQCwOECR-3ZGbVQPLqgTQox3vT0ziz010iUmaYv"

const PLAN_LABELS: Record<string, { label: string; amount: string }> = {
  "extend-1m": { label: "Mentorship Extension – 1 Month", amount: "$199" },
  "extend-2m": { label: "Mentorship Extension – 2 Months", amount: "$379" },
  "extend-3m": { label: "Mentorship Extension – 3 Months", amount: "$699" },
  "extend-6m": { label: "Mentorship Extension – 6 Months", amount: "$1,499" },
}

export async function POST(request: Request) {
  try {
    const { planId, name, email, telegram } = await request.json()

    const plan = PLAN_LABELS[planId]
    if (!plan || !name || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    await fetch(DISCORD_WEBHOOK_URL, {
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
              { name: "✈️ Telegram", value: telegram ? "@" + telegram : "N/A", inline: true },
              { name: "📦 Plan", value: plan.label, inline: true },
              { name: "💰 Amount", value: plan.amount, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to notify" }, { status: 500 })
  }
}
