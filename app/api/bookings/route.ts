import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

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
  const supabase = await createClient();
  const body = await request.json();
  const { booking_id, status, new_slot_id } = body;

  if (!booking_id) {
    return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
  }

  // Get current booking
  const { data: currentBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();

  if (fetchError || !currentBooking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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
