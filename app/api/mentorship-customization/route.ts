import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotificationEmail } from "@/lib/email"
import { customMentorshipPrice, CUSTOM_MENTORSHIP_MAX_SESSIONS } from "@/lib/plan-pricing"

/**
 * A request built on the "صمّم منتورشيبك" page. Nothing is charged here and
 * no checkout link is issued: an admin reviews the request and sets the final
 * price, the split and the payment methods on approval.
 *
 * The quoted price is recomputed server-side from the session count, so the
 * figure an admin reviews is the real one regardless of what the page sent.
 */
export async function POST(request: Request) {
  try {
    const { fullName, email, telegram, sessions, focus, level, goals } = await request.json()

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 })
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }, { status: 400 })
    }
    const count = Number(sessions)
    if (!Number.isInteger(count) || count < 1 || count > CUSTOM_MENTORSHIP_MAX_SESSIONS) {
      return NextResponse.json({ error: "عدد الجلسات غير صالح" }, { status: 400 })
    }

    const quotedPrice = customMentorshipPrice(count)
    const focusAreas = Array.isArray(focus)
      ? focus.filter((f) => typeof f === "string").slice(0, 20)
      : []

    const supabase = createAdminClient()
    const { data: inserted, error } = await supabase
      .from("custom_mentorship_requests")
      .insert({
        full_name: fullName.trim().slice(0, 120),
        email: email.toLowerCase().trim(),
        telegram_username:
          typeof telegram === "string" && telegram.trim() ? telegram.trim().replace(/^@/, "") : null,
        sessions: count,
        focus_areas: focusAreas,
        level: typeof level === "string" ? level.slice(0, 80) : null,
        goals: typeof goals === "string" ? goals.slice(0, 1000) : null,
        quoted_price: quotedPrice,
        status: "new",
      })
      .select("id")
      .single()

    if (error) {
      console.error("[mentorship-customization] insert failed:", error)
      return NextResponse.json({ error: "تعذر إرسال الطلب، حاول مرة أخرى." }, { status: 500 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      await sendNotificationEmail({
        to: adminEmail,
        title: `Custom mentorship request — ${count} session${count === 1 ? "" : "s"} ($${quotedPrice})`,
        message: [
          `${fullName} (${email}) built a custom mentorship and is waiting for review.`,
          `Sessions: ${count} · Quoted: $${quotedPrice}`,
          level ? `Level: ${level}` : null,
          focusAreas.length ? `Focus: ${focusAreas.join(" · ")}` : null,
          goals ? `Goal: ${goals}` : null,
          "Review it under Mentorship → Custom Requests in the admin dashboard.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      }).catch((e) => console.error("[mentorship-customization] admin alert failed:", e))
    }

    return NextResponse.json({ success: true, id: inserted.id, quotedPrice })
  } catch (error) {
    console.error("[mentorship-customization] failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
