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
        <td style="padding:8px 0">
          <span style="font-size:15px;color:#aaaaaa">Amount Paid: </span><span style="font-size:15px;font-weight:700;color:#f0a500">${amount}</span>
        </td>
      </tr>`
    : ""

  const tgSection = `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#0f1e35;border:1px solid #1e3a5f;border-radius:12px">
      <tr>
        <td style="padding:28px 24px;text-align:center">
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#ffffff">&#x1f389; Your Telegram Access</p>
          <p style="margin:0 0 22px;font-size:14px;color:#aaaaaa;line-height:1.7">
            Click the button below to join the private ${planLabel} Plan Telegram group. This link can only be used once.
          </p>
          ${tgInviteLink
            ? `<a href="${tgInviteLink}"
               style="display:block;background:#0ea5e9;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 24px;border-radius:8px;text-align:center">
              Join Telegram Group
            </a>`
            : `<p style="margin:0;font-size:14px;color:#aaaaaa">Your access link will be sent to you shortly by our team.</p>`
          }
        </td>
      </tr>
    </table>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>@media only screen and (max-width:600px){.email-body{padding:20px 12px !important}.email-inner{padding:0 !important}}</style>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px" class="email-body">
  <tr><td align="center">

    <table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
      <tr>
        <td style="padding:0 8px" class="email-inner">

          <!-- Title -->
          <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#f0a500">
            Payment Confirmed &#x2713;
          </h1>

          <!-- Subtitle -->
          <p style="margin:0 0 28px;font-size:15px;color:#dddddd;line-height:1.7">
            Thank you for your purchase. Your payment has been received.
          </p>

          <!-- Details box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e1e1e;border-radius:12px;margin-bottom:24px">
            <tr>
              <td style="padding:20px 24px;width:100%">
                <table width="100%" cellpadding="0" cellspacing="0" style="width:100%">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #2a2a2a">
                      <span style="font-size:15px;color:#aaaaaa">Plan: </span><span style="font-size:15px;font-weight:700;color:#ffffff">${planLabel}</span>
                    </td>
                  </tr>
                  ${amountRow}
                  <tr>
                    <td style="padding:8px 0">
                      <span style="font-size:15px;color:#aaaaaa">Order ID:</span><br>
                      <span style="font-size:13px;font-family:'Courier New',monospace;color:#ffffff;word-break:break-all">${orderId}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Telegram section -->
          ${tgSection}

          <!-- Footer note -->
          <p style="margin:28px 0 0;font-size:15px;color:#dddddd;line-height:1.7">
            Our team will reach out to you shortly to provide access. If you have any questions, reply to this email.
          </p>

          <!-- Divider + copyright -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px">
            <tr><td style="height:1px;background:#2a2a2a"></td></tr>
            <tr>
              <td style="padding-top:16px;text-align:center">
                <p style="margin:0;font-size:12px;color:#666666">
                  &copy; ${year} Mentix Trading. All rights reserved.
                </p>
              </td>
            </tr>
          </table>

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
    subject: `Payment Confirmed — ${opts.planLabel} #${opts.orderId.slice(-6)}`,
    html,
  })

  if (error) {
    console.error("[email] Failed to send confirmation email:", error)
  }
}
