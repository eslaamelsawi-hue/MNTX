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
        <td style="font-size:13px;color:#8a8a9a;padding:13px 0;border-bottom:1px solid #16162a">Amount Paid</td>
        <td style="font-size:15px;color:#c9930a;font-weight:700;text-align:right;padding:13px 0;border-bottom:1px solid #16162a">${amount}</td>
      </tr>`
    : ""

  const tgSection = tgInviteLink
    ? `<tr>
        <td style="padding:0 44px 40px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#120f00,#1c1600,#120f00);border:1px solid #2e2100;border-radius:16px">
            <tr><td style="height:1px;background:linear-gradient(90deg,transparent,#c49a0a,transparent);border-radius:16px 16px 0 0"></td></tr>
            <tr>
              <td style="padding:32px 32px 28px;text-align:center">
                <div style="font-size:10px;letter-spacing:6px;text-transform:uppercase;color:#5a4410;margin-bottom:16px">Exclusive Access</div>
                <h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#e8d090;letter-spacing:0.5px">Join Your Private Group</h2>
                <p style="margin:0 0 26px;font-size:13px;color:#5e4e20;line-height:1.9">
                  Live SMC signals &nbsp;&bull;&nbsp; Real-time analysis &nbsp;&bull;&nbsp; Full course access
                </p>
                <a href="${tgInviteLink}"
                   style="display:inline-block;background:linear-gradient(135deg,#a87000,#c9930a,#e8b020,#c9930a,#a87000);color:#0a0800;font-weight:800;padding:15px 48px;border-radius:8px;text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase">
                  Enter Now
                </a>
                <p style="margin:20px 0 0;font-size:10px;color:#2e2010;letter-spacing:2px;text-transform:uppercase">
                  Single-use &nbsp;&middot;&nbsp; Tap Start to activate
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060608;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#060608;padding:44px 16px">
  <tr><td align="center">

    <!-- Gold-glow outer border -->
    <table width="560" cellpadding="2" cellspacing="0" style="max-width:100%;background:linear-gradient(145deg,#2a1c00,#111120,#111120,#2a1c00);border-radius:20px">
      <tr><td style="border-radius:18px;overflow:hidden;background:#0c0c18;padding:0">

        <table width="100%" cellpadding="0" cellspacing="0">

          <!-- Thin gold top accent -->
          <tr><td style="height:1px;background:linear-gradient(90deg,transparent,#b8860b,#f5c842,#b8860b,transparent)"></td></tr>

          <!-- Brand header -->
          <tr>
            <td style="padding:44px 44px 36px;text-align:center">
              <div style="font-size:10px;letter-spacing:9px;color:#3a3218;text-transform:uppercase;margin-bottom:14px">TRADING ACADEMY</div>
              <div style="font-size:34px;font-weight:900;letter-spacing:9px;color:#c9930a;text-transform:uppercase">MENTIX</div>
              <div style="margin-top:28px;height:1px;background:linear-gradient(90deg,transparent,#1c1c2c,transparent)"></div>
            </td>
          </tr>

          <!-- Confirmed badge + headline -->
          <tr>
            <td style="padding:8px 44px 4px;text-align:center">
              <div style="font-size:10px;letter-spacing:5px;text-transform:uppercase;color:#c9930a;margin-bottom:16px">&#x2714;&nbsp; Verified &amp; Confirmed</div>
              <h1 style="margin:0;font-size:30px;font-weight:300;color:#e8e6e0;letter-spacing:1px;line-height:1.25">Payment <span style="font-weight:800">Received</span></h1>
              <p style="margin:14px 0 0;font-size:13px;color:#48486a;line-height:1.8">
                Your enrollment in the <span style="color:#c9930a;font-weight:600">Advanced SMC Course</span><br>is now active and confirmed.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:28px 44px"><div style="height:1px;background:linear-gradient(90deg,transparent,#1c1c2c,transparent)"></div></td></tr>

          <!-- Order details -->
          <tr>
            <td style="padding:0 44px 36px">
              <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#2e2e48;margin-bottom:14px">Order Details</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#8a8a9a;padding:13px 0;border-top:1px solid #16162a;border-bottom:1px solid #16162a">Plan</td>
                  <td style="font-size:13px;color:#d8d8e8;font-weight:600;text-align:right;padding:13px 0;border-top:1px solid #16162a;border-bottom:1px solid #16162a">${planLabel}</td>
                </tr>
                ${amountRow}
                <tr>
                  <td style="font-size:13px;color:#8a8a9a;padding:13px 0;border-bottom:1px solid #16162a">Reference</td>
                  <td style="font-size:11px;color:#383850;font-family:'Courier New',monospace;text-align:right;padding:13px 0;border-bottom:1px solid #16162a;word-break:break-all">${orderId}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Telegram section -->
          ${tgSection}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 44px;text-align:center;border-top:1px solid #10101e">
              <p style="margin:0 0 4px;font-size:10px;color:#28283a;text-transform:uppercase;letter-spacing:3px">Mentix &copy; ${year}</p>
              <p style="margin:0;font-size:11px;color:#1c1c2c">All rights reserved</p>
            </td>
          </tr>

        </table>

      </td></tr>
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
