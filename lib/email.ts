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
        <td style="padding:18px 0;border-bottom:1px solid #1a1a1a">
          <span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555">Amount Paid</span>
        </td>
        <td style="padding:18px 0;border-bottom:1px solid #1a1a1a;text-align:right">
          <span style="font-size:14px;font-weight:600;color:#c9930a;letter-spacing:1px">${amount}</span>
        </td>
      </tr>`
    : ""

  const tgSection = tgInviteLink
    ? `<tr>
        <td style="padding:48px 60px 52px">
          <div style="border-top:1px solid #1a1a1a;padding-top:48px;text-align:center">
            <p style="margin:0 0 6px;font-size:10px;letter-spacing:5px;text-transform:uppercase;color:#444">Exclusive Access</p>
            <h2 style="margin:0 0 20px;font-size:22px;font-weight:300;color:#ffffff;letter-spacing:3px;text-transform:uppercase">Telegram Group</h2>
            <p style="margin:0 0 36px;font-size:13px;color:#666;line-height:2;letter-spacing:0.5px">
              Live SMC signals &nbsp;&middot;&nbsp; Trade analysis &nbsp;&middot;&nbsp; Full course
            </p>
            <a href="${tgInviteLink}"
               style="display:inline-block;background:#c9930a;color:#000000;font-size:10px;font-weight:700;letter-spacing:5px;text-transform:uppercase;text-decoration:none;padding:16px 52px">
              Join Now
            </a>
            <p style="margin:28px 0 0;font-size:10px;color:#333;letter-spacing:2px;text-transform:uppercase">
              Single-use link
            </p>
          </div>
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080808;font-family:Georgia,'Times New Roman',serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:60px 16px">
  <tr><td align="center">

    <table width="540" cellpadding="0" cellspacing="0" style="max-width:100%">

      <!-- Logo -->
      <tr>
        <td style="padding-bottom:52px;text-align:center">
          <div style="font-size:11px;letter-spacing:10px;text-transform:uppercase;color:#c9930a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">MENTIX</div>
          <div style="margin-top:10px;height:1px;background:#c9930a;width:32px;margin-left:auto;margin-right:auto"></div>
        </td>
      </tr>

      <!-- Headline -->
      <tr>
        <td style="padding-bottom:52px;text-align:center;border-bottom:1px solid #1a1a1a">
          <h1 style="margin:0 0 16px;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#555;font-weight:400;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Payment Received</h1>
          <p style="margin:0;font-size:32px;font-weight:300;color:#ffffff;letter-spacing:2px;line-height:1.3">
            Order Confirmed
          </p>
        </td>
      </tr>

      <!-- Order details -->
      <tr>
        <td style="padding:0 0 0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:18px 0;border-bottom:1px solid #1a1a1a">
                <span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Plan</span>
              </td>
              <td style="padding:18px 0;border-bottom:1px solid #1a1a1a;text-align:right">
                <span style="font-size:13px;color:#ffffff;letter-spacing:1px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${planLabel}</span>
              </td>
            </tr>
            ${amountRow}
            <tr>
              <td style="padding:18px 0">
                <span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Reference</span>
              </td>
              <td style="padding:18px 0;text-align:right">
                <span style="font-size:11px;color:#444;font-family:'Courier New',monospace;word-break:break-all">${orderId}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Telegram -->
      ${tgSection}

      <!-- Footer -->
      <tr>
        <td style="padding-top:48px;text-align:center;border-top:1px solid #1a1a1a">
          <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#333;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
            Mentix Trading Academy &nbsp;&middot;&nbsp; &copy; ${year}
          </p>
        </td>
      </tr>

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
