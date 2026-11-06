import { NextResponse } from "next/server"
import { sendNotificationEmail } from "@/lib/email"
import { customMentorshipPrice, CUSTOM_MENTORSHIP_MAX_SESSIONS } from "@/lib/plan-pricing"

/**
 * The brief behind a custom mentorship order — what the buyer wants covered,
 * their level and their goal. Sent when they reach the payment step, so the
 * mentor has it whichever method they end up paying with (the payment routes
 * only carry a plan id).
 *
 * Advisory only: it grants nothing and prices nothing. The amount is
 * recomputed here purely so the notification can't be made to lie.
 */
export async function POST(request: Request) {
  try {
    const { email, telegram, sessions, focus, level, goals } = await request.json()
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }
    const count = Number(sessions)
    if (!Number.isInteger(count) || count < 1 || count > CUSTOM_MENTORSHIP_MAX_SESSIONS) {
      return NextResponse.json({ error: "Invalid session count" }, { status: 400 })
    }

    const chosen = Array.isArray(focus) ? focus.filter((f) => typeof f === "string").slice(0, 20) : []
    const summary = [
      `Email: ${email}`,
      telegram ? `Telegram: @${String(telegram).replace(/^@/, "")}` : null,
      `Sessions: ${count}`,
      `Price: $${customMentorshipPrice(count)}`,
      level ? `Level: ${String(level).slice(0, 80)}` : null,
      chosen.length ? `Focus: ${chosen.join(" · ")}` : null,
      goals ? `Goal: ${String(goals).slice(0, 600)}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      await sendNotificationEmail({
        to: adminEmail,
        title: `Custom mentorship brief — ${count} session${count === 1 ? "" : "s"}`,
        message: `Someone is checking out a custom mentorship.\n\n${summary}`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[mentorship-customization] failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
