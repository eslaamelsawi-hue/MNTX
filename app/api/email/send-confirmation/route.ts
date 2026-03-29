import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  // Check if email service is configured
  if (!resend) {
    console.warn("Email service not configured - RESEND_API_KEY missing");
    return NextResponse.json({
      success: true,
      message: "Booking confirmed (email service not configured)",
    });
  }
  try {
    const { client_name, client_email, date, start_time, duration, zoom_join_url, booking_id } =
      await request.json();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com";
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

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
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Date:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Time:</strong> ${start_time} (Cairo Time)</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} minutes</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Booking ID:</strong> ${booking_id}</p>
          ${zoom_join_url ? `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Zoom Link:</strong> <a href="${zoom_join_url}" style="color: #d4a017;">${zoom_join_url}</a></p>` : ""}
        </div>
        ${zoom_join_url ? `<div style="text-align: center; margin: 30px 0;"><a href="${zoom_join_url}" style="background-color: #d4a017; color: #0a0a0a; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join Zoom Meeting</a></div>` : ""}
        <p style="color: #888; font-size: 14px; line-height: 1.6;">If you need to reschedule or cancel, please contact us as soon as possible.</p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`;

    // Send to client
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>",
      to: client_email,
      subject: `Coaching Session Confirmed - ${formattedDate}`,
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
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Date:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Time:</strong> ${start_time} (Cairo Time)</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${duration} min</p>
          ${zoom_join_url ? `<p style="margin: 8px 0;"><a href="${zoom_join_url}" style="color: #d4a017;">Start Zoom Meeting</a></p>` : ""}
        </div>
      </div>
    </div>`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>",
      to: adminEmail,
      subject: `New Booking: ${client_name} - ${formattedDate}`,
      html: adminHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
