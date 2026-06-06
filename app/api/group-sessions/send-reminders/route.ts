import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  // Get all sessions scheduled for the next 20 minutes
  const now = new Date()
  const in20Minutes = new Date(now.getTime() + 20 * 60000)

  const { data: sessions, error } = await supabase
    .from("group_zoom_sessions")
    .select("*")
    .eq("status", "scheduled")
    .gte("session_date", now.toISOString().split("T")[0])
    .lte("session_date", in20Minutes.toISOString().split("T")[0])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let remindersSent = 0

  for (const session of sessions || []) {
    const sessionTime = new Date(`${session.session_date}T${session.start_time}`)
    const minutesUntilSession = Math.round((sessionTime.getTime() - now.getTime()) / 60000)

    // Only send reminder if it's between 10-20 minutes away
    if (minutesUntilSession >= 10 && minutesUntilSession <= 20) {
      // Get all registrations
      const { data: registrations } = await supabase
        .from("group_session_registrations")
        .select("client_email, client_name")
        .eq("session_id", session.id)

      for (const reg of registrations || []) {
        try {
          await resend.emails.send({
            from: "Mentix Trading <noreply@mentixtrading.com>",
            to: reg.client_email,
            subject: `⏰ Session Reminder: ${session.title} starts in ${minutesUntilSession} minutes!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 10px; text-align: center;">
                  <h2 style="color: white; margin: 0;">Session Starting Soon! ⏰</h2>
                </div>

                <div style="padding: 20px; background: #f8f9fa;">
                  <p>Hi ${reg.client_name},</p>
                  <p style="font-size: 18px; color: #1e40af;"><strong>${session.title}</strong> starts in ${minutesUntilSession} minutes!</p>

                  <div style="background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0;">
                    <p><strong>⏱️ Time:</strong> ${session.start_time}</p>
                    <p><strong>📍 Link:</strong> <a href="${session.zoom_join_url}">Click here to join</a></p>
                  </div>

                  ${session.zoom_join_url ? `
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${session.zoom_join_url}" style="background: #10b981; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                      Join Now
                    </a>
                  </div>
                  ` : ''}

                  <p style="color: #666; font-size: 14px;">Don't be late! See you soon.</p>
                </div>
              </div>
            `,
          })
          remindersSent++
        } catch (emailError) {
          console.error(`Failed to send reminder to ${reg.client_email}:`, emailError)
        }
      }
    }
  }

  return NextResponse.json({ remindersSent })
}
