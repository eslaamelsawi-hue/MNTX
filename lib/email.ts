/**
 * Shared email helper for Mentix Trading.
 * Sends a single, elegant confirmation email to the customer.
 * Admin notification is sent as a plain internal email separately.
 */

import { Resend } from "resend"

interface ConfirmationEmailOptions {
  to: string
  planLabel: string
  amount?: string   // e.g. "$49.00" or "49 USDT"
  orderId: string
  tgInviteLink?: string | null
}

function buildConfirmationHtml(opts: ConfirmationEmailOptions): string {
  const { planLabel, amount, orderId, tgInviteLink } = opts
  const year = new Date().getFullYear()

  const amountRow = amount
    ? `<tr>
        <td style="padding:14px 0;border-bottom:1px solid #eeeeee">
          <span style="font-size:13px;color:#888888">Amount Paid</span>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #eeeeee;text-align:right">
          <span style="font-size:14px;font-weight:700;color:#b8860b">${amount}</span>
        </td>
      </tr>`
    : ""

  const tgSection = tgInviteLink
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;background:#f0f6ff;border-radius:10px">
        <tr>
          <td style="padding:28px 32px;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#3a7bd5;font-weight:600">Your Access Link</p>
            <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#1a1a1a">Join the Private Telegram Group</p>
            <p style="margin:0 0 22px;font-size:13px;color:#666666;line-height:1.8">
              Live SMC signals &nbsp;&middot;&nbsp; Real-time analysis &nbsp;&middot;&nbsp; Full course
            </p>
            <a href="${tgInviteLink}"
               style="display:inline-block;background:#3a7bd5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:6px;letter-spacing:0.5px">
              Join Telegram Group &rarr;
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#aaaaaa">Single-use link &nbsp;&middot;&nbsp; Tap Start to activate</p>
          </td>
        </tr>
      </table>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 16px">
  <tr><td align="center">

    <!-- White card -->
    <table width="540" cellpadding="0" cellspacing="0" style="max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden">

      <!-- Gold top stripe -->
      <tr><td style="height:4px;background:linear-gradient(90deg,#b8860b,#f5c842,#b8860b)"></td></tr>

      <!-- Header -->
      <tr>
        <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid #eeeeee">
          <div style="font-size:22px;font-weight:900;letter-spacing:6px;color:#b8860b;text-transform:uppercase">MENTIX</div>
          <div style="font-size:11px;letter-spacing:3px;color:#aaaaaa;text-transform:uppercase;margin-top:6px">Trading Academy</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 40px 8px">
          <!-- Status badge -->
          <div style="display:inline-block;background:#e8f5e9;border-radius:20px;padding:6px 16px;margin-bottom:20px">
            <span style="font-size:12px;font-weight:700;color:#2e7d32;letter-spacing:1px">&#x2714;&nbsp; Payment Confirmed</span>
          </div>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a1a1a">Your enrollment is active.</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#666666;line-height:1.7">
            You have been successfully enrolled in the <strong style="color:#1a1a1a">Advanced SMC Course</strong>. Details below.
          </p>

          <!-- Order table -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:14px 0;border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee">
                <span style="font-size:13px;color:#888888">Plan</span>
              </td>
              <td style="padding:14px 0;border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;text-align:right">
                <span style="font-size:13px;font-weight:600;color:#1a1a1a">${planLabel}</span>
              </td>
            </tr>
            ${amountRow}
            <tr>
              <td style="padding:14px 0">
                <span style="font-size:13px;color:#888888">Order Reference</span>
              </td>
              <td style="padding:14px 0;text-align:right">
                <span style="font-size:11px;font-family:'Courier New',monospace;color:#aaaaaa;word-break:break-all">${orderId}</span>
              </td>
            </tr>
          </table>

          <!-- Telegram section -->
          ${tgSection}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:28px 40px;text-align:center;border-top:1px solid #eeeeee;margin-top:32px">
          <p style="margin:0;font-size:12px;color:#bbbbbb">
            &copy; ${year} Mentix Trading Academy &nbsp;&middot;&nbsp; All rights reserved
          </p>
        </td>
      </tr>

      <!-- Gold bottom stripe -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#b8860b,#f5c842,#b8860b)"></td></tr>

    </table>

  </td></tr>
</table>

</body>
</html>`
}

/**
 * Sends ONE confirmation email to the customer.
 * Does NOT send an admin notification — handle that separately if needed.
 */
export async function sendConfirmationEmail(opts: ConfirmationEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email")
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <onboarding@resend.dev>"
  const resend = new Resend(apiKey)

  const html = buildConfirmationHtml(opts)

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `Payment Confirmed — ${opts.planLabel}`,
    html,
  })

  if (error) {
    console.error("[email] Failed to send confirmation email:", error)
  }
}
