import "server-only"
import { sendEmail } from "@/lib/resend-send"

/** Sends the client confirmation + admin alert for a paid consultation
 *  booking. When the session was scheduled automatically the client email
 *  carries the Zoom link; otherwise it says the team will reach out. */
export async function sendConsultationEmails(opts: {
  email: string
  name?: string
  hours: number
  amount: number
  orderId: string
  preferredDate?: string
  zoomJoinUrl?: string | null
}): Promise<void> {
  const { email, name, hours, amount, orderId, preferredDate, zoomJoinUrl } = opts
  const displayName = name || email.split("@")[0]
  const hoursLabel = hours === 1 ? "ساعة واحدة" : `${hours} ساعات`
  const dateRow = preferredDate
    ? `<p style="color: #ccc; line-height: 1.8;">موعد جلستك: <strong style="color:#f5f5f5;">${preferredDate}</strong></p>`
    : ""
  const zoomBlock = zoomJoinUrl
    ? `<div style="text-align: center; margin: 28px 0;">
         <a href="${zoomJoinUrl}" style="background: linear-gradient(135deg, #d4a017 0%, #e8b923 100%); color: #0a0a0a; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">🔗 الانضمام إلى جلسة Zoom</a>
         <p style="margin: 12px 0 0; color: #888; font-size: 12px; word-break: break-all;">${zoomJoinUrl}</p>
       </div>`
    : ""
  const closingLine = zoomJoinUrl
    ? `<p style="color: #888; font-size: 14px; line-height: 1.6;">احتفظ بهذا الرابط — ستستخدمه للانضمام في موعد الجلسة. لو احتجت تغيير الموعد، تواصل معنا.</p>`
    : `<p style="color: #ccc; line-height: 1.8;">سيتواصل معك فريقنا قريبًا لتأكيد التفاصيل النهائية.</p>`

  const clientResult = await sendEmail({
    to: email,
    subject: `تم تأكيد حجز استشارتك (${hoursLabel})`,
    html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">Mentix Trading</h1>
        <p style="color: #888; margin: 5px 0 0;">تم تأكيد الدفع لاستشارتك</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #f5f5f5;">مرحبًا ${displayName}،</h2>
        <p style="color: #ccc; line-height: 1.8;">
          تم تأكيد دفعتك لاستشارة مدتها <strong style="color:#f5f5f5;">${hoursLabel}</strong> بقيمة
          <strong style="color:#f5f5f5;">${amount}$</strong>.
        </p>
        ${dateRow}
        ${zoomBlock}
        ${closingLine}
        <p style="color: #888; font-size: 13px;">رقم الطلب: ${orderId}</p>
      </div>
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Mentix Trading. All rights reserved.</p>
      </div>
    </div>`,
  })
  if (!clientResult.success) {
    console.error("[consultation-email] client confirmation failed:", clientResult.error)
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@mentix.com"
  const adminResult = await sendEmail({
    to: adminEmail,
    subject: `New consultation booking: ${displayName} (${hoursLabel})`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d4a017;">
        <h1 style="color: #d4a017; margin: 0;">New Consultation Booking</h1>
        <p style="color: #888; margin: 5px 0 0;">${zoomJoinUrl ? "Scheduled — Zoom meeting created" : "Reach out to schedule"}</p>
      </div>
      <div style="padding: 30px 0;">
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; border-left: 4px solid #d4a017;">
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Client:</strong> ${displayName}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Email:</strong> ${email}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${hours} hour${hours > 1 ? "s" : ""}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Amount:</strong> $${amount}</p>
          ${preferredDate ? `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Session time:</strong> ${preferredDate}</p>` : ""}
          ${zoomJoinUrl ? `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Zoom:</strong> <a href="${zoomJoinUrl}" style="color: #d4a017;">${zoomJoinUrl}</a></p>` : `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Scheduling:</strong> not set — reach out to arrange a time</p>`}
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Order:</strong> ${orderId}</p>
        </div>
      </div>
    </div>`,
  })
  if (!adminResult.success) {
    console.error("[consultation-email] admin alert failed:", adminResult.error)
  }
}
