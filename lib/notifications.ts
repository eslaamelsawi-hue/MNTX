import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotificationEmail } from "@/lib/email"

type NotificationType = "info" | "invoice" | "session" | "system"

/** Clients can opt out of notification emails in Settings; in-app notifications
 *  are unaffected. Defaults to true (opted in) when no preference row exists. */
async function wantsEmail(supabase: ReturnType<typeof createAdminClient>, clientEmail: string): Promise<boolean> {
  const { data } = await supabase
    .from("client_preferences")
    .select("email_notifications")
    .eq("client_email", clientEmail.toLowerCase().trim())
    .maybeSingle()
  return data?.email_notifications ?? true
}

export async function createNotification(opts: {
  clientEmail: string
  title: string
  message: string
  type?: NotificationType
  link?: string | null
  sendEmail?: boolean
}) {
  const supabase = createAdminClient()
  const { error } = await supabase.from("notifications").insert({
    client_email: opts.clientEmail.toLowerCase().trim(),
    title: opts.title,
    message: opts.message,
    type: opts.type || "info",
    link: opts.link || null,
  })
  if (error) console.error("[notifications] Failed to create notification:", error)

  if (opts.sendEmail && (await wantsEmail(supabase, opts.clientEmail))) {
    await sendNotificationEmail({ to: opts.clientEmail, title: opts.title, message: opts.message })
  }
}

/** Sends the same notification to every distinct client with a subscription on record. */
export async function broadcastNotification(opts: {
  title: string
  message: string
  type?: NotificationType
  link?: string | null
  sendEmail?: boolean
}) {
  const supabase = createAdminClient()
  const { data: subs, error: subsError } = await supabase
    .from("user_subscriptions")
    .select("client_email")
  if (subsError) {
    console.error("[notifications] Failed to load clients for broadcast:", subsError)
    return
  }

  const emails = Array.from(new Set((subs ?? []).map((s) => s.client_email.toLowerCase().trim())))
  if (emails.length === 0) return

  const { error } = await supabase.from("notifications").insert(
    emails.map((client_email) => ({
      client_email,
      title: opts.title,
      message: opts.message,
      type: opts.type || "info",
      link: opts.link || null,
    }))
  )
  if (error) console.error("[notifications] Failed to broadcast notification:", error)

  if (opts.sendEmail) {
    await Promise.all(
      emails.map(async (to) => {
        if (await wantsEmail(supabase, to)) await sendNotificationEmail({ to, title: opts.title, message: opts.message })
      })
    )
  }
}
