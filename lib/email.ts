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

  const amountBlock = amount
    ? `<td style="padding-right:40px">
        <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#8080a0;margin-bottom:6px">Amount</div>
        <div style="font-size:20px;font-weight:800;color:#c9930a">${amount}</div>
       </td>`
    : ""

  const tgStub = tgInviteLink
    ? `<!-- Perforated tear line -->
      <tr>
        <td style="padding:0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="18" style="background:#06060e">
                <div style="width:18px;height:24px;border-radius:0 12px 12px 0;background:#06060e"></div>
              </td>
              <td style="border-top:2px dashed #3a3a5c;height:24px"></td>
              <td width="18" style="background:#06060e">
                <div style="width:18px;height:24px;border-radius:12px 0 0 12px;background:#06060e"></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Stub -->
      <tr>
        <td style="padding:30px 40px 36px;text-align:center">
          <div style="font-size:9px;letter-spacing:6px;text-transform:uppercase;color:#7070a0;margin-bottom:16px">Access Pass</div>
          <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#e0dff5;letter-spacing:0.5px">Private Telegram Group</h2>
          <p style="margin:0 0 24px;font-size:12px;color:#8080a8;line-height:2">
            Live signals &nbsp;&#xb7;&nbsp; SMC analysis &nbsp;&#xb7;&nbsp; Full course
          </p>
          <a href="${tgInviteLink}"
             style="display:inline-block;background:linear-gradient(135deg,#a06a00,#c9930a,#e8b828,#c9930a,#a06a00);color:#08060a;font-weight:900;padding:14px 46px;border-radius:4px;text-decoration:none;font-size:10px;letter-spacing:5px;text-transform:uppercase">
            Activate
          </a>
          <p style="margin:18px 0 0;font-size:10px;color:#505070;letter-spacing:2px;text-transform:uppercase">
            Single-use &nbsp;&#xb7;&nbsp; Tap start in Telegram to join
          </p>
        </td>
      </tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06060e;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#06060e;padding:48px 16px">
  <tr><td align="center">

    <!-- Ticket -->
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:100%;background:#0c0c1a;border-radius:12px;overflow:hidden">

      <!-- Gold header band -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a1000,#2a1e00,#1a1000);padding:30px 40px 26px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle">
                <div style="font-size:9px;letter-spacing:6px;text-transform:uppercase;color:#9a7828;margin-bottom:7px">Trading Academy</div>
                <div style="font-size:30px;font-weight:900;letter-spacing:8px;color:#c9930a;line-height:1">MENTIX</div>
              </td>
              <td style="text-align:right;vertical-align:middle">
                <div style="display:inline-block;border:1px solid #7a5c18;border-radius:4px;padding:5px 12px">
                  <div style="font-size:8px;letter-spacing:4px;text-transform:uppercase;color:#9a7828">Status</div>
                  <div style="font-size:11px;font-weight:700;color:#c9930a;letter-spacing:2px;margin-top:2px">CONFIRMED</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Route row -->
      <tr>
        <td style="background:#0a0a16;padding:24px 40px;border-top:1px solid #1e1e32;border-bottom:1px solid #1e1e32">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:bottom">
                <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#7070a0;margin-bottom:6px">From</div>
                <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:#c0c0e0">ENROLL</div>
              </td>
              <td style="text-align:center;vertical-align:middle;padding:0 8px">
                <div style="font-size:24px;color:#505080;letter-spacing:-2px">&#x2014;&#x25b6;</div>
              </td>
              <td style="text-align:right;vertical-align:bottom">
                <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#7070a0;margin-bottom:6px;text-align:right">Plan</div>
                <div style="font-size:14px;font-weight:800;letter-spacing:1px;color:#e8e6ff;text-align:right">${planLabel.toUpperCase()}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Details row -->
      <tr>
        <td style="padding:24px 40px 28px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              ${amountBlock}
              <td>
                <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#8080a0;margin-bottom:6px">Order Ref</div>
                <div style="font-size:11px;font-family:'Courier New',monospace;color:#606088;word-break:break-all;max-width:280px">${orderId}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- TG stub (perforated) -->
      ${tgStub}

      <!-- Footer barcode strip -->
      <tr>
        <td style="background:#08080f;padding:14px 40px;border-top:1px solid #1e1e32">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-family:'Courier New',monospace;font-size:22px;letter-spacing:-1px;color:#2a2a48;line-height:1">
                  |||&#xfe0e; || ||| || || ||| | || ||| || | ||
                </div>
              </td>
              <td style="text-align:right;vertical-align:bottom">
                <div style="font-size:9px;color:#7070a0;letter-spacing:2px;text-transform:uppercase">
                  &copy;&nbsp;${year}
                </div>
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
    subject: `Payment Confirmed — ${opts.planLabel}`,
    html,
  })

  if (error) {
    console.error("[email] Failed to send confirmation email:", error)
  }
}
