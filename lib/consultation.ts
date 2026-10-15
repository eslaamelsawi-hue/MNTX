import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { grantConsultationHours } from "@/lib/grant-hours"
import { confirmBookingWithZoomAndHours } from "@/lib/bookings"
import { sendConsultationEmails } from "@/lib/consultation-email"
import { utcIsoToCairo, addMinutesToTime } from "@/lib/timezone"

/** Splits the start time stored on the order into Cairo date + time. Values
 *  carrying a timezone (the free-date picker sends absolute UTC) get
 *  converted; a bare "YYYY-MM-DDTHH:mm" is already Cairo wall-clock, which is
 *  how the public calendar stores its slots. */
function toCairoDateTime(start: string): { date: string; time: string } | null {
  const trimmed = start.trim()
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const ms = new Date(trimmed).getTime()
    if (Number.isNaN(ms)) return null
    return utcIsoToCairo(new Date(ms).toISOString())
  }
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(trimmed)
  if (!match) return null
  return { date: match[1], time: `${match[2]}:00` }
}

/**
 * Fulfills a paid consultation: grants the purchased hours, books the chosen
 * time as a real session (so it shows up everywhere a normal booking does),
 * creates the Zoom meeting through the same S2S integration the booking page
 * uses, and emails the client the join link.
 *
 * If no time was captured (or it can't be parsed), it still grants the hours
 * and emails the client — the team then arranges the time manually.
 */
export async function fulfillConsultation(opts: {
  baseUrl: string
  email: string
  name?: string
  hours: number
  amount: number
  orderId: string
  preferredStart?: string | null
  preferredSlotId?: string | null
}): Promise<void> {
  const { baseUrl, email, name, hours, amount, orderId, preferredStart, preferredSlotId } = opts
  const normalizedEmail = email.toLowerCase().trim()
  const clientName = name || normalizedEmail.split("@")[0]
  const duration = hours * 60

  await grantConsultationHours(normalizedEmail, hours, name, amount)

  const cairo = preferredStart ? toCairoDateTime(preferredStart) : null
  if (!cairo) {
    await sendConsultationEmails({ email: normalizedEmail, name, hours, amount, orderId })
    return
  }

  const admin = createAdminClient()
  let slotId = preferredSlotId || null

  try {
    if (slotId) {
      await admin
        .from("availability_slots")
        .update({ is_booked: true, updated_at: new Date().toISOString() })
        .eq("id", slotId)
    } else {
      const { data: slot, error } = await admin
        .from("availability_slots")
        .insert({
          date: cairo.date,
          start_time: cairo.time,
          end_time: addMinutesToTime(cairo.time, duration),
          duration,
          is_booked: true,
        })
        .select("id")
        .single()
      if (error || !slot) throw new Error(error?.message || "Failed to create slot")
      slotId = slot.id
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        slot_id: slotId,
        client_name: clientName,
        client_email: normalizedEmail,
        client_message: `Paid consultation — ${hours}h (order ${orderId})`,
        duration,
        status: "pending",
      })
      .select("id")
      .single()
    if (bookingError || !booking) throw new Error(bookingError?.message || "Failed to create booking")

    const { zoomJoinUrl } = await confirmBookingWithZoomAndHours({
      baseUrl,
      bookingId: booking.id,
      clientName,
      clientEmail: normalizedEmail,
      duration,
      slot: { date: cairo.date, start_time: cairo.time },
      sendEmail: false,
    })

    await sendConsultationEmails({
      email: normalizedEmail,
      name,
      hours,
      amount,
      orderId,
      preferredDate: `${cairo.date} ${cairo.time.slice(0, 5)} (بتوقيت القاهرة)`,
      zoomJoinUrl,
    })
  } catch (e) {
    console.error("[consultation] booking/Zoom setup failed — falling back to manual scheduling:", e)
    await sendConsultationEmails({
      email: normalizedEmail,
      name,
      hours,
      amount,
      orderId,
      preferredDate: `${cairo.date} ${cairo.time.slice(0, 5)} (بتوقيت القاهرة)`,
    })
  }
}
