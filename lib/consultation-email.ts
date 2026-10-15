import "server-only"
import { sendEmail } from "@/lib/resend-send"

/** Sends the client confirmation + admin alert for a paid consultation
 *  booking. Scheduling isn't self-service — both emails say the team will
 *  reach out to arrange a time matching the purchased duration. */
export async function sendConsultationEmails(opts: {
  email: string
  name?: string
  hours: number
  amount: number
  orderId: string
  preferredDate?: string
}): Promise<void> {
  const { email, name, hours, amount, orderId, preferredDate } = opts
  const displayName = name || email.split("@")[0]
  const hoursLabel = hours === 1 ? "ساعة واحدة" : `${hours} ساعات`
  const dateRow = preferredDate
    ? `<p style="color: #ccc; line-height: 1.8;">الموعد المفضّل الذي اخترته: <strong style="color:#f5f5f5;">${preferredDate}</strong> — سنؤكده معك أو نقترح أقرب وقت متاح.</p>`
    : ""

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
        <p style="color: #ccc; line-height: 1.8;">سيتواصل معك فريقنا قريبًا لتأكيد التفاصيل النهائية.</p>
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
        <p style="color: #888; margin: 5px 0 0;">Reach out to schedule</p>
      </div>
      <div style="padding: 30px 0;">
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 18px; border-left: 4px solid #d4a017;">
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Client:</strong> ${displayName}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Email:</strong> ${email}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Duration:</strong> ${hours} hour${hours > 1 ? "s" : ""}</p>
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Amount:</strong> $${amount}</p>
          ${preferredDate ? `<p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Requested date:</strong> ${preferredDate}</p>` : ""}
          <p style="margin: 8px 0; color: #ccc;"><strong style="color: #f5f5f5;">Order:</strong> ${orderId}</p>
        </div>
      </div>
    </div>`,
  })
  if (!adminResult.success) {
    console.error("[consultation-email] admin alert failed:", adminResult.error)
  }
}
