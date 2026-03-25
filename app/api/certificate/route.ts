import { NextRequest, NextResponse } from "next/server"

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1483927213668827166/H7UrLaIloU9dsCQD4UY43fk7ai3_BNr6JJMMWW5ZkozoWm-SUY24PR9XVYkPGjj2RuiR"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, email, courseName, completionDate, notes } = body

    if (!fullName || !email || !courseName || !completionDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const embed = {
      title: "New Certificate Request",
      color: 0xf59e0b,
      fields: [
        { name: "Full Name", value: fullName, inline: true },
        { name: "Email", value: email, inline: true },
        { name: "Course Name", value: courseName, inline: false },
        { name: "Completion Date", value: completionDate, inline: true },
        ...(notes ? [{ name: "Notes", value: notes, inline: false }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Mentix Trading - Certificate System" },
    }

    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "**New completion certificate request received!**",
        embeds: [embed],
      }),
    })

    if (!discordRes.ok) {
      return NextResponse.json(
        { error: "Failed to send to webhook" },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}