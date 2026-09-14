import "server-only"
import { Resend } from "resend"

let client: Resend | null = null
function getClient(): Resend | null {
  if (client) return client
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  client = new Resend(apiKey)
  return client
}

export type SendEmailArgs = { to: string | string[]; subject: string; html: string; from?: string }

/**
 * Sends an email via Resend and actually checks whether it worked.
 *
 * resend.emails.send() returns `{ data, error }` rather than throwing on
 * API-level failures (rate limits, invalid recipient, temporary 5xx) — every
 * call site in this codebase used to just `await` the promise and move on
 * without ever looking at `error`, so a failed send was silently swallowed
 * and logged nowhere anyone would see it. This is now the one place that
 * checks, and retries automatically on failures that look transient.
 */
export async function sendEmail(args: SendEmailArgs, retries = 2): Promise<{ success: boolean; error?: string }> {
  const resend = getClient()
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${args.subject}" to ${args.to}`)
    return { success: false, error: "RESEND_API_KEY not configured" }
  }

  const from = args.from || process.env.RESEND_FROM_EMAIL || "Mentix Trading <noreply@mentixtrading.com>"
  let lastError: string | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { error } = await resend.emails.send({ from, to: args.to, subject: args.subject, html: args.html })
    if (!error) return { success: true }

    lastError = error.message || String(error)
    console.error(`[email] send failed (attempt ${attempt + 1}/${retries + 1}) to ${args.to}:`, lastError)

    const transient = /rate|limit|timeout|429|5\d\d|network|econn/i.test(lastError)
    if (!transient || attempt === retries) break
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
  }
  return { success: false, error: lastError }
}
