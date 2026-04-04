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

  const orderRows = [
    `<tr>
      <td style="padding:16px 20px;border-bottom:1px solid #1e1e30">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#555">Plan</span>
        <div style="font-size:15px;font-weight:600;color:#f0f0f0;margin-top:5px">${planLabel}</div>
      </td>
    </tr>`,
    amount
      ? `<tr>
          <td style="padding:16px 20px;border-bottom:1px solid #1e1e30">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#555">Amount Paid</span>
            <div style="font-size:15px;font-weight:700;color:#d4a017;margin-top:5px">${amount}</div>
          </td>
        </tr>`
      : "",
    `<tr>
      <td style="padding:16px 20px">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#555">Order Reference</span>
        <div style="font-size:12px;font-family:'Courier New',monospace;color:#666;margin-top:5px;word-break:break-all">${orderId}</div>
      </td>
    </tr>`,
  ].join("")

  const tgSection = tgInviteLink
    ? `<tr>
        <td style="padding:0 36px 36px">
          <div style="background:linear-gradient(135deg,#080e1a,#0d1a2e);border:1px solid #1a3a5c;border-radius:12px;padding:30px 28px;text-align:center">
            <div style="font-size:36px;margin-bottom:14px">🚀</div>
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:700;color:#eaf0f8;letter-spacing:0.5px">Your Community Access</h2>
            <p style="margin:0 0 22px;font-size:13px;color:#6a8aaa;line-height:1.7">
              Join our exclusive Telegram group to receive live SMC signals,<br>
              real-time trade analysis, and full course content.
            </p>
            <a href="${tgInviteLink}"
               style="display:inline-block;background:linear-gradient(135deg,#1e8ec9,#1573a8);color:#ffffff;font-weight:700;padding:14px 38px;border-radius:8px;text-decoration:none;font-size:14px;letter-spacing:0.5px">
              Join Telegram Group &rarr;
            </a>
            <p style="margin:18px 0 0;font-size:10px;color:#334d66;letter-spacing:1.5px;text-transform:uppercase">
              Single-use &middot; Activated once you press Start
            </p>
          </div>
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:48px 16px">
  <tr><td align="center">

    <!-- Card -->
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:100%;background:#0e0e1a;border:1px solid #1e1e30;border-radius:16px;overflow:hidden">

      <!-- Gold top bar -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#7a5c00,#d4a017,#f5c842,#d4a017,#7a5c00)"></td></tr>

      <!-- Brand header -->
      <tr>
        <td style="padding:36px 36px 24px;text-align:center;background:linear-gradient(180deg,#11111f,#0e0e1a)">
          <div style="font-size:26px;font-weight:900;letter-spacing:5px;color:#d4a017;text-transform:uppercase">MENTIX</div>
          <div style="font-size:10px;letter-spacing:6px;color:#444;text-transform:uppercase;margin-top:4px">TRADING ACADEMY</div>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 36px"><div style="height:1px;background:linear-gradient(90deg,transparent,#2a2a3a,transparent)"></div></td></tr>

      <!-- Success icon + title -->
      <tr>
        <td style="padding:32px 36px 8px;text-align:center">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background:linear-gradient(135deg,#0d2a0d,#0a1a0a);border:1.5px solid #1a4a1a;border-radius:50%;font-size:26px;margin-bottom:18px">&#10003;</div>
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#f0f0f0;letter-spacing:0.5px">Payment Confirmed</h1>
          <p style="margin:0;font-size:14px;color:#777;line-height:1.6">
            Your enrollment in the <strong style="color:#d4a017">Advanced SMC Course</strong><br>has been successfully processed.
          </p>
        </td>
      </tr>

      <!-- Order details card -->
      <tr>
        <td style="padding:28px 36px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;border:1px solid #1e1e30;border-radius:10px">
            ${orderRows}
          </table>
        </td>
      </tr>

      <!-- Telegram access section -->
      ${tgSection}

      <!-- Footer -->
      <tr><td style="height:1px;background:#1a1a2a"></td></tr>
      <tr>
        <td style="padding:24px 36px;text-align:center;background:#09090f">
          <p style="margin:0 0 4px;font-size:11px;color:#333;text-transform:uppercase;letter-spacing:2px">Mentix Trading Academy</p>
          <p style="margin:0;font-size:11px;color:#2a2a3a">&copy; ${year} &middot; All rights reserved</p>
        </td>
      </tr>

      <!-- Gold bottom bar -->
      <tr><td style="height:2px;background:linear-gradient(90deg,#7a5c00,#d4a017,#f5c842,#d4a017,#7a5c00)"></td></tr>

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
