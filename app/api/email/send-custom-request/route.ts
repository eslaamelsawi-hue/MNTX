import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/resend-send"

/** Notifies both sides of a custom time request's lifecycle: "received"
 *  (client ack + admin alert to go approve/decline it) and "declined"
 *  (client-only, sent by the admin decline action). Approval reuses the
 *  existing send-confirmation email since an approved request becomes a
 *  normal confirmed booking. */
export async function POST(request: NextRequest) {
  try {
    const { type, client_name, client_email, date, start_time, duration, booking_id, reason } = await request.json()

    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com"
    const cairoFormattedDate = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "Africa/Cairo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const cairoTime = start_time.slice(0, 5)

    if (type === "declined") {
      const result = await sendEmail({
        to: client_email,
        subject: "Your requested time couldn't be confirmed",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
            <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
          </div>
          <div style="padding: 30px 0;">
            <h2 style="color: #f5f5f5;">Hello ${client_name},</h2>
            <p style="color: #ccc; line-height: 1.6;">Unfortunately your requested time of <strong style="color:#f5f5f5;">${cairoFormattedDate} at ${cairoTime} Cairo Time</strong> isn't available. Please pick a different time from your dashboard, or request another custom time.</p>
            ${reason ? `<div style="background-color: #1a1a1a; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #d4a017;"><p style="margin: 0; color: #ccc; font-size: 14px;"><strong style="color: #f5f5f5;">Note from your mentor:</strong><br/>${escapeHtml(String(reason))}</p></div>` : ""}
          </div>
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
          </div>
        </div>`,
      })
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })
      return NextResponse.json({ success: true })
    }

    // type === "received"
    const clientResult = await sendEmail({
      to: client_email,
      subject: "We've received your requested time",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
          <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
          <p style="color: #888; margin: 5px 0 0;">Custom Time Requested — Awaiting Confirmation</p>
        </div>
        <div style="padding: 30px 0;">
          <h2 style="color: #f5f5f5;">Hello ${client_name},</h2>
          <p style="color: #ccc; line-height: 1.6;">We've received your requested session time and it's awaiting confirmation from your mentor:</p>
          <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #d4a017;">
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Requested Date:</strong> ${cairoFormattedDate}</p>
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Requested Time:</strong> ${cairoTime} Cairo Time</p>
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} minutes</p>
          </div>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">You'll get another email as soon as it's confirmed (or if we need to suggest a different time).</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
        </div>
      </div>`,
    })

    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `Custom time request: ${client_name} - ${cairoFormattedDate}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
          <h1 style="color: #d4a017; margin: 0;">Custom Time Request</h1>
          <p style="color: #888; margin: 5px 0 0;">Needs your approval</p>
        </div>
        <div style="padding: 30px 0;">
          <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; border-left: 4px solid #d4a017;">
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Client:</strong> ${client_name}</p>
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Email:</strong> ${client_email}</p>
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Requested:</strong> ${cairoFormattedDate} at ${cairoTime} Cairo Time</p>
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} min</p>
            <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Booking ID:</strong> ${booking_id}</p>
          </div>
          <p style="color: #888; font-size: 14px; margin-top: 16px;">Approve or decline it from the Bookings tab in your admin dashboard.</p>
        </div>
      </div>`,
    })

    if (!clientResult.success) return NextResponse.json({ error: clientResult.error }, { status: 502 })
    if (!adminResult.success) console.error("[send-custom-request] admin alert failed (client email still sent):", adminResult.error)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Custom-request email error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
