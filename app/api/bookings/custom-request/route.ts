import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { utcIsoToCairo, addMinutesToTime } from "@/lib/timezone"
import { confirmBookingWithZoomAndHours, hasMatchingAutoApproveRule } from "@/lib/bookings"

const ALLOWED_DURATIONS = [30, 60, 90]

/**
 * Lets a client request ANY date/time for a session (not limited to
 * admin-created slots). Creates a real availability_slots row for the exact
 * requested time (so it renders correctly everywhere a normal booking would)
 * plus a `bookings` row.
 *
 * If the client has a matching auto-approve rule (admin-managed, see
 * /api/admin/booking-rules), it's confirmed immediately — same as a normal
 * slot booking. Otherwise it's created as "pending": no Zoom meeting, no
 * hours deducted yet, until an admin approves it (see /api/admin/bookings
 * PATCH action=approve).
 */
export async function POST(request: NextRequest) {
  try {
    const { start_at_iso, duration, client_name, client_email, client_phone, client_message, client_timezone } = await request.json()

    const missing: string[] = []
    if (!start_at_iso) missing.push("start_at_iso")
    if (!duration) missing.push("duration")
    if (!client_name) missing.push("client_name")
    if (!client_email) missing.push("client_email")
    if (missing.length > 0) {
      return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 })
    }
    if (!ALLOWED_DURATIONS.includes(Number(duration))) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 })
    }

    const startMs = new Date(start_at_iso).getTime()
    if (Number.isNaN(startMs)) {
      return NextResponse.json({ error: "Invalid start_at_iso" }, { status: 400 })
    }
    if (startMs <= Date.now()) {
      return NextResponse.json({ error: "Please pick a time in the future" }, { status: 400 })
    }

    const normalizedEmail = client_email.toLowerCase().trim()
    const { date: cairoDate, time: cairoStartTime } = utcIsoToCairo(new Date(startMs).toISOString())
    const cairoEndTime = addMinutesToTime(cairoStartTime, Number(duration))

    const admin = createAdminClient()

    // Hours check — same rule as the normal booking flow.
    const { data: activeSub } = await admin
      .from("user_subscriptions")
      .select("id, remaining_hours")
      .eq("client_email", normalizedEmail)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const hoursNeeded = Number(duration) / 60
    if (!activeSub || activeSub.remaining_hours < hoursNeeded) {
      return NextResponse.json({ error: "noHoursRemaining" }, { status: 403 })
    }

    // Weekly limit — pending requests count too, so this can't be used to
    // stack more sessions in a week than the normal flow would allow.
    const { data: limitSetting } = await admin
      .from("admin_settings")
      .select("value")
      .eq("key", "weekly_booking_limit")
      .single()
    const weeklyLimit = parseInt(limitSetting?.value || "2") || 2

    const slotDate = new Date(`${cairoDate}T00:00:00Z`)
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
        .eq("client_email", normalizedEmail)
        .in("status", ["confirmed", "completed", "pending"])
        .in("slot_id", weekSlotIds)
      if ((weeklyCount || 0) >= weeklyLimit) {
        return NextResponse.json({ error: "weeklyLimitReached" }, { status: 403 })
      }
    }

    const { data: slot, error: slotError } = await admin
      .from("availability_slots")
      .insert({ date: cairoDate, start_time: cairoStartTime, end_time: cairoEndTime, duration: Number(duration), is_booked: true })
      .select()
      .single()
    if (slotError || !slot) {
      return NextResponse.json({ error: slotError?.message || "Failed to create slot" }, { status: 500 })
    }

    const autoApprove = await hasMatchingAutoApproveRule(normalizedEmail, cairoDate, cairoStartTime, cairoEndTime)

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        slot_id: slot.id,
        client_name,
        client_email: normalizedEmail,
        client_phone: client_phone || null,
        client_message: client_message || null,
        duration: Number(duration),
        status: autoApprove ? "confirmed" : "pending",
        client_timezone: client_timezone || null,
      })
      .select()
      .single()

    if (bookingError || !booking) {
      // Nothing references the slot yet, safe to remove.
      await admin.from("availability_slots").delete().eq("id", slot.id)
      return NextResponse.json({ error: bookingError?.message || "Failed to create booking request" }, { status: 500 })
    }

    if (autoApprove) {
      const { zoomJoinUrl } = await confirmBookingWithZoomAndHours({
        baseUrl: request.nextUrl.origin,
        bookingId: booking.id,
        clientName: client_name,
        clientEmail: normalizedEmail,
        duration: Number(duration),
        slot: { date: cairoDate, start_time: cairoStartTime },
        clientTimezone: client_timezone,
      })
      return NextResponse.json({ booking: { ...booking, status: "confirmed" }, slot, autoApproved: true, zoom_join_url: zoomJoinUrl })
    }

    try {
      await fetch(`${request.nextUrl.origin}/api/email/send-custom-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "received",
          booking_id: booking.id,
          client_name,
          client_email: normalizedEmail,
          date: cairoDate,
          start_time: cairoStartTime,
          duration: Number(duration),
        }),
      })
    } catch (e) {
      console.error("[bookings/custom-request] notification email failed (non-fatal):", e)
    }

    return NextResponse.json({ booking, slot })
  } catch (error) {
    console.error("[bookings/custom-request] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
