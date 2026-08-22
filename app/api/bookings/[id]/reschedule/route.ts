import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Server-to-Server OAuth: exchange credentials for an access token (mirrors
// the create-meeting-s2s route — kept local since it's the only other caller).
async function getZoomAccessToken(): Promise<string | null> {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID
  if (!clientId || !clientSecret || !accountId) return null

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token as string
}

/** Convert a Cairo-local slot date/time into the exact UTC instant Zoom expects. */
function slotToZoomUtc(date: string, time: string): string {
  const normalized = time.length === 5 ? `${time}:00` : time
  const probe = new Date(`${date}T12:00:00Z`)
  const offsetMs =
    new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime() -
    new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  return new Date(new Date(`${date}T${normalized}Z`).getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "Z")
}

async function updateZoomMeetingTime(meetingId: string, date: string, time: string, duration: number) {
  try {
    const token = await getZoomAccessToken()
    if (!token) return
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        start_time: slotToZoomUtc(date, time),
        duration,
        timezone: "Africa/Cairo",
      }),
    })
  } catch (e) {
    console.error("[bookings/reschedule] Zoom update failed (non-fatal):", e)
  }
}

/** Client-facing reschedule: move one of the caller's OWN upcoming bookings to
 *  a different open slot. Ownership is enforced by matching the logged-in
 *  session's email against the booking's client_email — this is deliberately
 *  a separate, auth-checked route rather than reusing the admin PATCH
 *  endpoint (`/api/admin/bookings`), which has no ownership/auth check at all. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params
  const { new_slot_id } = await request.json().catch(() => ({}))
  if (!new_slot_id) {
    return NextResponse.json({ error: "new_slot_id is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = user.email.toLowerCase().trim()

  const admin = createAdminClient()

  const { data: booking } = await admin
    .from("bookings")
    .select("*, availability_slots(*)")
    .eq("id", bookingId)
    .single()
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (booking.client_email?.toLowerCase().trim() !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (booking.status !== "confirmed" && booking.status !== "rescheduled") {
    return NextResponse.json({ error: "This session can no longer be rescheduled." }, { status: 400 })
  }
  // A missed (past) session can still be rescheduled, but only within a week
  // of when it was originally supposed to happen — after that it's too stale.
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const oldSlot = booking.availability_slots
  if (oldSlot) {
    const startsAt = new Date(`${oldSlot.date}T${oldSlot.start_time || "00:00:00"}`)
    if (Date.now() - startsAt.getTime() > ONE_WEEK_MS) {
      return NextResponse.json({ error: "This session is more than a week old and can no longer be rescheduled." }, { status: 400 })
    }
  }
  if (new_slot_id === booking.slot_id) {
    return NextResponse.json({ error: "Please pick a different time." }, { status: 400 })
  }

  const { data: newSlot } = await admin
    .from("availability_slots")
    .select("*")
    .eq("id", new_slot_id)
    .eq("is_booked", false)
    .single()
  if (!newSlot) return NextResponse.json({ error: "That time is no longer available." }, { status: 409 })
  if (newSlot.duration !== booking.duration) {
    return NextResponse.json({ error: "The new slot must be the same length as your session." }, { status: 400 })
  }

  // Enforce the weekly session limit for the NEW slot's week (the DB trigger
  // is authoritative and will reject the update below too, but this gives a
  // clean error message up front instead of a raw Postgres error).
  const { data: limitSetting } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", "weekly_booking_limit")
    .single()
  const weeklyLimit = parseInt(limitSetting?.value || "2") || 2

  const slotDate = new Date(`${newSlot.date}T00:00:00Z`)
  const daysSinceMonday = (slotDate.getUTCDay() + 6) % 7
  const weekStartDate = new Date(slotDate)
  weekStartDate.setUTCDate(slotDate.getUTCDate() - daysSinceMonday)
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6)
  const weekStart = weekStartDate.toISOString().split("T")[0]
  const weekEnd = weekEndDate.toISOString().split("T")[0]

  const { data: slotsInWeek } = await admin
    .from("availability_slots")
    .select("id")
    .gte("date", weekStart)
    .lte("date", weekEnd)
  const weekSlotIds = (slotsInWeek || []).map((s) => s.id)

  if (weekSlotIds.length > 0) {
    const { count: weeklyCount } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("client_email", email)
      .in("status", ["confirmed", "completed"])
      .in("slot_id", weekSlotIds)
      .neq("id", bookingId)
    if ((weeklyCount || 0) >= weeklyLimit) {
      return NextResponse.json({ error: "weeklyLimitReached" }, { status: 403 })
    }
  }

  // Free the old slot, claim the new one.
  await admin.from("availability_slots").update({ is_booked: false, updated_at: new Date().toISOString() }).eq("id", booking.slot_id)
  await admin.from("availability_slots").update({ is_booked: true, updated_at: new Date().toISOString() }).eq("id", new_slot_id)

  const { data: updated, error: updateError } = await admin
    .from("bookings")
    .update({ slot_id: new_slot_id, status: "rescheduled", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .select("*, availability_slots(*)")
    .single()

  if (updateError) {
    // Revert the slot swap.
    await admin.from("availability_slots").update({ is_booked: false, updated_at: new Date().toISOString() }).eq("id", new_slot_id)
    await admin.from("availability_slots").update({ is_booked: true, updated_at: new Date().toISOString() }).eq("id", booking.slot_id)
    if (updateError.message?.includes("weeklyLimitReached")) {
      return NextResponse.json({ error: "weeklyLimitReached" }, { status: 403 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (booking.zoom_meeting_id) {
    await updateZoomMeetingTime(booking.zoom_meeting_id, newSlot.date, newSlot.start_time, booking.duration)
  }

  try {
    await fetch(`${request.nextUrl.origin}/api/email/send-reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        client_name: booking.client_name,
        client_email: booking.client_email,
        old_date: oldSlot?.date,
        old_start_time: oldSlot?.start_time,
        date: newSlot.date,
        start_time: newSlot.start_time,
        duration: booking.duration,
        zoom_join_url: booking.zoom_join_url,
        client_timezone: booking.client_timezone,
      }),
    })
  } catch (e) {
    console.error("[bookings/reschedule] reschedule email failed (non-fatal):", e)
  }

  return NextResponse.json({ booking: updated })
}
