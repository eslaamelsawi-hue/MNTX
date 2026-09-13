import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { confirmBookingWithZoomAndHours } from "@/lib/bookings";

async function isAdmin() {
  const cookieStore = await cookies();
  return !!cookieStore.get("admin_session")?.value;
}

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*, availability_slots(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const { booking_id, status, new_slot_id, action, reason } = body;

  if (!booking_id) {
    return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
  }

  // Get current booking
  const { data: currentBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, availability_slots(*)")
    .eq("id", booking_id)
    .single();

  if (fetchError || !currentBooking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Approve or decline a client's custom time request (status "pending").
  if (action === "approve" || action === "decline") {
    if (currentBooking.status !== "pending") {
      return NextResponse.json({ error: "Only pending requests can be approved or declined" }, { status: 400 });
    }
    const slot = currentBooking.availability_slots;

    if (action === "decline") {
      if (slot) {
        await supabase
          .from("availability_slots")
          .update({ is_booked: false, updated_at: new Date().toISOString() })
          .eq("id", slot.id);
      }
      const declineNote = typeof reason === "string" && reason.trim() ? reason.trim() : null;

      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", admin_note: declineNote, updated_at: new Date().toISOString() })
        .eq("id", booking_id)
        .select("*, availability_slots(*)")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      try {
        await fetch(`${request.nextUrl.origin}/api/email/send-custom-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "declined",
            client_name: currentBooking.client_name,
            client_email: currentBooking.client_email,
            date: slot?.date,
            start_time: slot?.start_time,
            duration: currentBooking.duration,
            reason: declineNote,
          }),
        });
      } catch (e) {
        console.error("Decline notification email failed:", e);
      }

      return NextResponse.json({ booking: data });
    }

    // action === "approve" — same steps a normal booking already goes
    // through automatically: create the Zoom meeting, deduct hours, confirm.
    if (!slot) {
      return NextResponse.json({ error: "This request has no time slot on file" }, { status: 500 });
    }

    await confirmBookingWithZoomAndHours({
      baseUrl: request.nextUrl.origin,
      bookingId: booking_id,
      clientName: currentBooking.client_name,
      clientEmail: currentBooking.client_email,
      duration: currentBooking.duration,
      slot: { date: slot.date, start_time: slot.start_time },
      clientTimezone: currentBooking.client_timezone,
    });

    const { data, error } = await supabase
      .from("bookings")
      .select("*, availability_slots(*)")
      .eq("id", booking_id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booking: data });
  }

  // If rescheduling
  if (new_slot_id && new_slot_id !== currentBooking.slot_id) {
    // Free old slot
    await supabase
      .from("availability_slots")
      .update({ is_booked: false, updated_at: new Date().toISOString() })
      .eq("id", currentBooking.slot_id);

    // Book new slot
    await supabase
      .from("availability_slots")
      .update({ is_booked: true, updated_at: new Date().toISOString() })
      .eq("id", new_slot_id);

    const { data, error } = await supabase
      .from("bookings")
      .update({
        slot_id: new_slot_id,
        status: "rescheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id)
      .select("*, availability_slots(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  }

  // If just updating status (cancel, complete, etc.)
  if (status) {
    if (status === "cancelled") {
      // Free the slot
      await supabase
        .from("availability_slots")
        .update({ is_booked: false, updated_at: new Date().toISOString() })
        .eq("id", currentBooking.slot_id);

      // Restore hours to user's subscription
      if (currentBooking.client_email && currentBooking.duration) {
        // Get current used_hours
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("used_hours")
          .eq("client_email", currentBooking.client_email.toLowerCase().trim())
          .single();

        if (subscription) {
          // Reduce used_hours by the booking duration (convert minutes to hours)
          const hoursToRestore = currentBooking.duration / 60;
          const newUsedHours = Math.max(0, subscription.used_hours - hoursToRestore);
          await supabase
            .from("user_subscriptions")
            .update({ used_hours: newUsedHours })
            .eq("client_email", currentBooking.client_email.toLowerCase().trim());
          console.log(`Restored ${hoursToRestore} hours for ${currentBooking.client_email}`);
        }
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", booking_id)
      .select("*, availability_slots(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data });
  }

  return NextResponse.json({ error: "No action specified" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs array required" }, { status: 400 });
  }

  const { error, count } = await supabase
    .from("bookings")
    .delete({ count: "exact" })
    .in("id", ids);

  if (error) {
    console.error("Delete bookings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: count });
}
