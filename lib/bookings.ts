import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Runs the same steps a normal (slot-based) booking already goes through
 * automatically at creation time: create the Zoom meeting, deduct
 * mentorship hours, flip the booking to "confirmed", and send the
 * confirmation email. Shared by the admin "approve" action and the
 * auto-approve path for custom time requests that match a rule.
 */
export async function confirmBookingWithZoomAndHours(opts: {
  baseUrl: string
  bookingId: string
  clientName: string
  clientEmail: string
  duration: number
  slot: { date: string; start_time: string }
  clientTimezone?: string | null
}): Promise<{ zoomJoinUrl: string | null }> {
  const { baseUrl, bookingId, clientName, clientEmail, duration, slot, clientTimezone } = opts

  let zoomData: { id?: number; join_url?: string; start_url?: string } | null = null
  try {
    const zoomRes = await fetch(`${baseUrl}/api/zoom/create-meeting-s2s`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: `1-on-1 Coaching: ${clientName}`,
        start_time: (() => {
          const time = slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time
          const probe = new Date(`${slot.date}T12:00:00Z`)
          const offset =
            new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime() -
            new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
          return new Date(new Date(`${slot.date}T${time}Z`).getTime() - offset).toISOString()
        })(),
        duration,
      }),
    })
    if (zoomRes.ok) zoomData = await zoomRes.json()
    else console.error("[bookings] Zoom meeting creation error:", await zoomRes.json())
  } catch (e) {
    console.error("[bookings] Zoom meeting creation failed:", e)
  }

  const admin = createAdminClient()
  try {
    const normalizedEmail = clientEmail.toLowerCase().trim()
    const { data: activeSub } = await admin
      .from("user_subscriptions")
      .select("id, used_hours")
      .eq("client_email", normalizedEmail)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (activeSub) {
      const hoursToDeduct = duration / 60
      await admin
        .from("user_subscriptions")
        .update({ used_hours: activeSub.used_hours + hoursToDeduct, updated_at: new Date().toISOString() })
        .eq("id", activeSub.id)
    }
  } catch (e) {
    console.error("[bookings] hour deduction failed:", e)
  }

  await admin
    .from("bookings")
    .update({
      status: "confirmed",
      zoom_meeting_id: zoomData?.id?.toString() || null,
      zoom_join_url: zoomData?.join_url || null,
      zoom_start_url: zoomData?.start_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  try {
    await fetch(`${baseUrl}/api/email/send-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        client_name: clientName,
        client_email: clientEmail,
        date: slot.date,
        start_time: slot.start_time,
        duration,
        zoom_join_url: zoomData?.join_url || null,
        client_timezone: clientTimezone || null,
      }),
    })
  } catch (e) {
    console.error("[bookings] confirmation email failed:", e)
  }

  return { zoomJoinUrl: zoomData?.join_url || null }
}

/** True if this client has an auto-approve rule matching the requested Cairo
 *  date/time — a rule with day_of_week/start_time/end_time all null matches
 *  any date/time (a blanket auto-approve for that client). */
export async function hasMatchingAutoApproveRule(
  email: string,
  cairoDate: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { data: rules } = await admin
    .from("booking_auto_approve_rules")
    .select("day_of_week, start_time, end_time")
    .eq("client_email", email.toLowerCase().trim())
  if (!rules || rules.length === 0) return false

  const dayOfWeek = new Date(`${cairoDate}T00:00:00Z`).getUTCDay()

  return rules.some((rule) => {
    if (rule.day_of_week !== null && rule.day_of_week !== dayOfWeek) return false
    if (rule.start_time && startTime < rule.start_time) return false
    if (rule.end_time && endTime > rule.end_time) return false
    return true
  })
}
