import { NextResponse } from "next/server"
import { addWaitlistEntry } from "@/lib/waitlist-store"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const source = typeof body.source === "string" ? body.source.trim() : "propfirm"

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }

    await addWaitlistEntry({ name, email, phone, source })

    // Optional: notify admin on Discord if a webhook is configured.
    const webhook = process.env.DISCORD_WAITLIST_WEBHOOK
    if (webhook) {
      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "📝 New Waitlist Application",
              color: 0xf5a623,
              fields: [
                { name: "👤 Name", value: name, inline: true },
                { name: "📧 Email", value: email, inline: true },
                { name: "📱 Phone", value: phone, inline: true },
                { name: "📄 Source", value: source, inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
