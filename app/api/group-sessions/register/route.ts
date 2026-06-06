import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { session_id, client_email, client_name, zoom_url, session_title, session_date, start_time, end_time } = body

  if (!session_id || !client_email || !client_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from("group_zoom_sessions")
    .select("*")
    .eq("id", session_id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from("group_session_registrations")
    .select("id")
    .eq("session_id", session_id)
    .eq("client_email", client_email.toLowerCase().trim())
    .single()

  if (existing) {
    return NextResponse.json({ error: "Already registered for this session" }, { status: 400 })
  }

  // Check capacity
  if (session.max_participants) {
    const { count } = await supabase
      .from("group_session_registrations")
      .select("id", { count: "exact" })
      .eq("session_id", session_id)

    if (count && count >= session.max_participants) {
      return NextResponse.json({ error: "Session is full" }, { status: 400 })
    }
  }

  // Register user
  const { data, error } = await supabase
    .from("group_session_registrations")
    .insert({
      session_id,
      client_email: client_email.toLowerCase().trim(),
      client_name,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send confirmation email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`)
    const formattedDate = sessionDateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const formattedTime = `${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">Registration Confirmed! ✓</h1>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <p style="color: #333; font-size: 16px;">Hi ${client_name},</p>

          <p style="color: #555;">You've successfully registered for:</p>

          <div style="background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h2 style="color: #1e1e2e; margin-top: 0;">${session.title}</h2>

            <div style="color: #555; margin: 10px 0;">
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${formattedTime}</p>
            </div>
          </div>

          ${session.zoom_join_url ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${session.zoom_join_url}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              📹 Join Zoom Meeting
            </a>
          </div>
          ` : ''}

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0;">
              <strong>💡 Tip:</strong> We'll send you a reminder 15 minutes before the session starts.
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If you have any questions, please don't hesitate to reach out to our support team.
          </p>

          <p style="color: #666; font-size: 14px;">
            Best regards,<br/>
            <strong>Mentix Trading</strong>
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 5px; margin-top: 20px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `

    await resend.emails.send({
      from: "Mentix Trading <noreply@mentixtrading.com>",
      to: client_email,
      subject: `✓ Registered: ${session.title}`,
      html: htmlContent,
    })
  } catch (emailError) {
    console.error("Failed to send email:", emailError)
    // Don't fail the registration if email fails
  }

  // Send admin notification
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const adminEmail = process.env.ADMIN_EMAIL

    if (adminEmail) {
      await resend.emails.send({
        from: "Mentix Trading <noreply@mentixtrading.com>",
        to: adminEmail,
        subject: `New Registration: ${session.title}`,
        html: `
          <p><strong>${client_name}</strong> (${client_email}) just registered for <strong>${session.title}</strong></p>
          <p>Date: ${session.session_date} at ${session.start_time}</p>
        `,
      })
    }
  } catch (adminEmailError) {
    console.error("Failed to send admin notification:", adminEmailError)
  }

  return NextResponse.json({ registration: data })
}
