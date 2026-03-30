import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  if (!resend) {
    console.warn("Email service not configured - RESEND_API_KEY missing");
    return NextResponse.json({ success: true, message: "Email service not configured" });
  }

  try {
    const { client_name, client_email, remaining_hours } = await request.json();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mentixtrading.com";
    const extendLinkEn = `${baseUrl}/en/extend`;
    const extendLinkAr = `${baseUrl}/ar/extend`;

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">Mentorship Hours Running Low</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">Hello ${client_name},</h2>
        <p style="color: #ccc; line-height: 1.6;">
          We wanted to let you know that your mentorship hours are running low. 
          You currently have <strong style="color: #d4a017;">${remaining_hours} hour(s)</strong> remaining.
        </p>
        <p style="color: #ccc; line-height: 1.6;">
          Your online Zoom coaching sessions will end soon. To continue getting 1-on-1 coaching, 
          you can extend your mentorship by clicking the button below.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${extendLinkEn}" style="background-color: #d4a017; color: #0a0a0a; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Extend My Mentorship
          </a>
        </div>
        <div style="text-align: center; margin: 10px 0;">
          <a href="${extendLinkAr}" style="color: #d4a017; text-decoration: underline; font-size: 14px;">تمديد الإرشاد (عربي)</a>
        </div>
        <p style="color: #888; font-size: 14px; line-height: 1.6;">
          Don't miss out on your trading journey — extend now and keep the momentum going!
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>",
      to: client_email,
      subject: "⏳ Your Mentorship Hours Are Running Low — Extend Now",
      html: emailHtml,
    });

    console.log("✅ Low-hours warning email sent to", client_email);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Low-hours email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
