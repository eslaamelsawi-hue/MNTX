import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotificationEmail } from "@/lib/email"

type NotificationType = "info" | "invoice" | "session" | "system"

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

  if (opts.sendEmail) {
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
    await Promise.all(emails.map((to) => sendNotificationEmail({ to, title: opts.title, message: opts.message })))
  }
}
