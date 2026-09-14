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

  const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <noreply@mentixtrading.com>"
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

/**
 * Sends a simple notification email to a client (new invoice, installment
 * due, etc). Best-effort — failures are logged, not thrown.
 */
export async function sendNotificationEmail(opts: { to: string; title: string; message: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping notification email")
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <noreply@mentixtrading.com>"
  const resend = new Resend(apiKey)
  const year = new Date().getFullYear()

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:Arial,Helvetica,sans-serif">
  <div class="email-body" style="padding:40px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#0f1e35;border:1px solid #1e3a5f;border-radius:12px">
      <tr>
        <td style="padding:32px 28px">
          <p style="margin:0 0 16px;font-size:19px;font-weight:700;color:#ffffff">${opts.title}</p>
          <p style="margin:0;font-size:15px;color:#c7c7c7;line-height:1.7">${opts.message}</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center;margin-top:24px;font-size:12px;color:#5b6b82">© ${year} Mentix Trading</p>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.title,
    html,
  })

  if (error) {
    console.error("[email] Failed to send notification email:", error)
  }
}

/**
 * Sends a personalized single-use discount-code email (admin-triggered, one
 * client at a time from the Discount Offers tab). Best-effort like the other
 * senders here — failures are logged, not thrown.
 */
export async function sendDiscountOfferEmail(opts: {
  to: string
  planLabel: string
  originalPrice: number
  discountPercent: number
  couponCode: string
  expiresAt: string
  checkoutUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured" }
  }

  const from = process.env.RESEND_FROM_EMAIL || "Mentix Trading <noreply@mentixtrading.com>"
  const resend = new Resend(apiKey)
  const year = new Date().getFullYear()

  const discountedPrice = Math.round(opts.originalPrice * (1 - opts.discountPercent / 100) * 100) / 100
  const expiresLabel = new Date(opts.expiresAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
    <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #d4a017;">
      <p style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #d4a017;">MENTIX TRADING</p>
      <p style="margin: 6px 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #888;">Exclusive Offer</p>
    </div>

    <div style="padding: 36px 4px 8px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; color: #ffffff; line-height: 1.3;">A ${opts.discountPercent}% discount on your mentorship — just for you</h1>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #ccc;">Hi,</p>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #ccc;">
        We wanted to reach out personally with something special: a <strong style="color:#f5f5f5;">${opts.discountPercent}% discount</strong> on our
        ${opts.planLabel} — full mentorship, weekly live sessions, and everything included, at a fraction of the usual price.
      </p>

      <div style="background: linear-gradient(135deg, rgba(212,160,23,0.12) 0%, rgba(212,160,23,0.04) 100%); border: 1px dashed #d4a017; border-radius: 10px; padding: 22px; text-align: center; margin: 0 0 24px;">
        <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #a8842f;">Your code</p>
        <p style="margin: 0 0 10px; font-size: 30px; font-weight: 800; letter-spacing: 3px; color: #d4a017; font-family: 'Courier New', monospace;">${opts.couponCode}</p>
        <p style="margin: 0; font-size: 13px; color: #999;">Enter this at checkout to apply your discount</p>
      </div>

      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px 20px; margin: 0 0 28px; border-left: 4px solid #d4a017;">
        <p style="margin: 0 0 8px; color: #ccc; font-size: 14px;"><strong style="color:#f5f5f5;">Plan:</strong> ${opts.planLabel} (normally $${opts.originalPrice.toFixed(2)})</p>
        <p style="margin: 0 0 8px; color: #ccc; font-size: 14px;"><strong style="color:#f5f5f5;">Your price:</strong> <span style="color:#4ade80; font-weight:700;">$${discountedPrice.toFixed(2)}</span> (${opts.discountPercent}% off)</p>
        <p style="margin: 0; color: #ccc; font-size: 14px;"><strong style="color:#f5f5f5;">Valid until:</strong> ${expiresLabel} — single use</p>
      </div>

      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${opts.checkoutUrl}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 44px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(212, 160, 23, 0.3);">Claim Your Discount</a>
      </div>

      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #888;">
        Questions before you enroll? Just reply to this email or message us on Telegram — we're happy to help.
      </p>
    </div>

    <div style="text-align: center; padding: 24px 0; margin-top: 16px; border-top: 1px solid #333; color: #666; font-size: 12px;">
      <p style="margin:0;">&copy; ${year} Mentix Trading. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `A ${opts.discountPercent}% Discount on Your Mentorship — Just for You`,
    html,
  })

  if (error) {
    console.error("[email] Failed to send discount offer email:", error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
