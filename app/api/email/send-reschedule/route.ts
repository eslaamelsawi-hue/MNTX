import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

// Convert a Cairo-stored time to the client's local timezone (server-side, Node Intl).
function cairoToClientTime(slotDate: string, slotTime: string, clientTz: string): { time: string; date: string; tzAbbr: string } {
  const probe = new Date(`${slotDate}T12:00:00Z`)
  const cairoOffsetMs =
    new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime() -
    new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  const normalized = slotTime.length === 5 ? `${slotTime}:00` : slotTime
  const trueUtc = new Date(new Date(`${slotDate}T${normalized}Z`).getTime() - cairoOffsetMs)

  const time = new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "2-digit", minute: "2-digit", hour12: true }).format(trueUtc)
  const date = new Intl.DateTimeFormat("en-US", { timeZone: clientTz, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(trueUtc)
  const tzAbbr =
    new Intl.DateTimeFormat("en-US", { timeZone: clientTz, timeZoneName: "short" }).format(trueUtc).split(", ").pop() ?? clientTz

  return { time, date, tzAbbr }
}

let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: NextRequest) {
  if (!resend) {
    console.warn("Email service not configured - RESEND_API_KEY missing")
    return NextResponse.json({ success: true, message: "Session rescheduled (email service not configured)" })
  }
  try {
    const {
      client_name, client_email, date, start_time, duration, zoom_join_url, booking_id, client_timezone,
      old_date, old_start_time,
    } = await request.json()

    const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com"
    const effectiveTz = client_timezone || "Africa/Cairo"
    const newLocal = cairoToClientTime(date, start_time, effectiveTz)
    const cairoTime = start_time.slice(0, 5)
    const showReference = effectiveTz !== "Africa/Cairo"

    const oldLocal = old_date && old_start_time ? cairoToClientTime(old_date, old_start_time, effectiveTz) : null

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">1-on-1 Coaching Session Rescheduled</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">Hello ${client_name},</h2>
        <p style="color: #ccc; line-height: 1.6;">Your coaching session has been rescheduled. Here are the new details:</p>
        ${oldLocal ? `<p style="color: #888; font-size: 14px; text-decoration: line-through;">Was: ${oldLocal.date} at ${oldLocal.time} (${oldLocal.tzAbbr})</p>` : ""}
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #d4a017;">
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">New Date:</strong> ${newLocal.date}</p>
          <p style="margin: 8px 0; color: #ccc;">
            <strong style="color: #f5f5f5;">New Time:</strong>
            <span style="color: #d4a017; font-weight: bold;">${newLocal.time} (${newLocal.tzAbbr})</span>
            ${showReference ? `<span style="color: #666; font-size: 13px;"> &nbsp;·&nbsp; ${cairoTime} Cairo Time</span>` : ""}
          </p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} minutes</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Booking ID:</strong> ${booking_id}</p>
          ${zoom_join_url ? `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Zoom Link:</strong> <a href="${zoom_join_url}" style="color: #d4a017;">${zoom_join_url}</a></p>` : ""}
        </div>
        ${zoom_join_url ? `<div style="text-align: center; margin: 30px 0;">
          <a href="${zoom_join_url}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(212, 160, 23, 0.3);">🔗 Join Meeting Now</a>
        </div>` : ""}
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Mentix Trading <noreply@mentixtrading.com>",
      to: client_email,
      subject: `Session Rescheduled - ${newLocal.date}`,
      html: emailHtml,
    })

    const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Session Rescheduled</h1>
      </div>
      <div style="padding: 30px 0;">
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; border-left: 4px solid #d4a017;">
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Client:</strong> ${client_name}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Email:</strong> ${client_email}</p>
          ${old_date ? `<p style="margin: 8px 0; color: #888;">Was: ${old_date} ${old_start_time?.slice(0, 5) || ""} Cairo Time</p>` : ""}
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">New Date:</strong> ${date}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">New Time:</strong> ${cairoTime} Cairo Time</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} min</p>
          ${zoom_join_url ? `<p style="margin: 8px 0;"><a href="${zoom_join_url}" style="color: #d4a017;">Start Zoom Meeting</a></p>` : ""}
        </div>
      </div>
    </div>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Mentix Trading <noreply@mentixtrading.com>",
      to: adminEmail,
      subject: `Session Rescheduled: ${client_name} - ${date}`,
      html: adminHtml,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Reschedule email error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
