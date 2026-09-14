import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend-send";

// Convert a Cairo-stored time to the client's local timezone (server-side, Node Intl).
function cairoToClientTime(
  slotDate: string,
  slotTime: string,
  clientTz: string
): { time: string; date: string; tzAbbr: string } {
  const probe = new Date(`${slotDate}T12:00:00Z`)
  const cairoOffsetMs =
    new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime() -
    new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  const normalized = slotTime.length === 5 ? `${slotTime}:00` : slotTime
  const trueUtc = new Date(new Date(`${slotDate}T${normalized}Z`).getTime() - cairoOffsetMs)

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: clientTz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(trueUtc)

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: clientTz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(trueUtc)

  const tzAbbr =
    new Intl.DateTimeFormat("en-US", { timeZone: clientTz, timeZoneName: "short" })
      .format(trueUtc)
      .split(", ")
      .pop() ?? clientTz

  return { time, date, tzAbbr }
}

export async function POST(request: NextRequest) {
  try {
    const { client_name, client_email, date, start_time, duration, zoom_join_url, booking_id, client_timezone } =
      await request.json();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com";

    // Cairo-formatted date shown to the admin
    const cairoFormattedDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
      timeZone: "Africa/Cairo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Client local time (falls back to Cairo if no timezone provided)
    const effectiveTz = client_timezone || "Africa/Cairo"
    const local = cairoToClientTime(date, start_time, effectiveTz)
    const cairoTime = start_time.slice(0, 5)
    const showReference = effectiveTz !== "Africa/Cairo"

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">1-on-1 Coaching Session Confirmed</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">Hello ${client_name},</h2>
        <p style="color: #ccc; line-height: 1.6;">Your coaching session has been confirmed! Here are the details:</p>
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #d4a017;">
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Date:</strong> ${local.date}</p>
          <p style="margin: 8px 0; color: #ccc;">
            <strong style="color: #f5f5f5;">Time:</strong>
            <span style="color: #d4a017; font-weight: bold;">${local.time} (${local.tzAbbr})</span>
            ${showReference ? `<span style="color: #666; font-size: 13px;"> &nbsp;·&nbsp; ${cairoTime} Cairo Time</span>` : ""}
          </p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} minutes</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Booking ID:</strong> ${booking_id}</p>
          ${zoom_join_url ? `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Zoom Link:</strong> <a href="${zoom_join_url}" style="color: #d4a017;">${zoom_join_url}</a></p>` : ""}
        </div>
        ${zoom_join_url ? `<div style="text-align: center; margin: 30px 0;">
          <a href="${zoom_join_url}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(212, 160, 23, 0.3); transition: all 0.3s ease;">🔗 Join Meeting Now</a>
        </div>` : ""}
        <p style="color: #888; font-size: 14px; line-height: 1.6;">If you need to reschedule or cancel, please contact us as soon as possible.</p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`;

    // Send to client
    const clientResult = await sendEmail({
      to: client_email,
      subject: `Coaching Session Confirmed - ${local.date}`,
      html: emailHtml,
    });

    // Send notification to admin
    const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">New Booking</h1>
      </div>
      <div style="padding: 30px 0;">
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; border-left: 4px solid #d4a017;">
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Client:</strong> ${client_name}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Email:</strong> ${client_email}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Date:</strong> ${cairoFormattedDate}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Time:</strong> ${cairoTime} Cairo Time</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} min</p>
          ${zoom_join_url ? `<p style="margin: 8px 0;"><a href="${zoom_join_url}" style="color: #d4a017;">Start Zoom Meeting</a></p>` : ""}
        </div>
      </div>
    </div>`;

    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `New Booking: ${client_name} - ${cairoFormattedDate}`,
      html: adminHtml,
    });

    if (!clientResult.success) {
      return NextResponse.json({ error: clientResult.error }, { status: 502 });
    }
    if (!adminResult.success) {
      console.error("[send-confirmation] admin notification failed (client email still sent):", adminResult.error);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
