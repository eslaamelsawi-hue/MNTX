import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { slot_id, client_name, client_email, client_phone, client_message, duration } = body;
  const normalizedEmail = client_email?.toLowerCase().trim();

  if (!slot_id || !client_name || !client_email || !duration) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Check slot availability
  const { data: slot, error: slotError } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("id", slot_id)
    .eq("is_booked", false)
    .single();

  if (slotError || !slot) {
    return NextResponse.json(
      { error: "Slot is no longer available" },
      { status: 409 }
    );
  }

  // Check if user has remaining mentorship hours
  const adminDb = createAdminClient();
  const { data: activeSub } = await adminDb
    .from("user_subscriptions")
    .select("id, remaining_hours")
    .eq("client_email", normalizedEmail)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const hoursNeeded = duration / 60;
  if (!activeSub || activeSub.remaining_hours < hoursNeeded) {
    return NextResponse.json(
      { error: "noHoursRemaining" },
      { status: 403 }
    );
  }

  // Enforce max 2 sessions per calendar week (Monday-Sunday) per user.
  const slotDate = new Date(`${slot.date}T00:00:00Z`);
  const dayOfWeek = slotDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const weekStartDate = new Date(slotDate);
  weekStartDate.setUTCDate(slotDate.getUTCDate() - daysSinceMonday);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

  const weekStart = weekStartDate.toISOString().split("T")[0];
  const weekEnd = weekEndDate.toISOString().split("T")[0];

  const { data: weeklyBookings, error: weeklyBookingsError } = await adminDb
    .from("bookings")
    .select("id, availability_slots!inner(date)")
    .eq("client_email", normalizedEmail)
    .in("status", ["confirmed", "completed"])
    .gte("availability_slots.date", weekStart)
    .lte("availability_slots.date", weekEnd);

  if (weeklyBookingsError) {
    return NextResponse.json(
      { error: weeklyBookingsError.message },
      { status: 500 }
    );
  }

  if ((weeklyBookings?.length || 0) >= 2) {
    return NextResponse.json(
      { error: "weeklyLimitReached" },
      { status: 403 }
    );
  }

  // Create Zoom meeting
  let zoomData = null;
  try {
    const zoomRes = await fetch(
      `${request.nextUrl.origin}/api/zoom/create-meeting`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `1-on-1 Coaching: ${client_name}`,
          start_time: `${slot.date}T${slot.start_time}`,
          duration,
        }),
      }
    );
    if (zoomRes.ok) {
      zoomData = await zoomRes.json();
    }
  } catch (e) {
    console.error("Zoom meeting creation failed:", e);
  }

  // Mark slot as booked
  await supabase
    .from("availability_slots")
    .update({ is_booked: true, updated_at: new Date().toISOString() })
    .eq("id", slot_id);

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      slot_id,
      client_name,
      client_email,
      client_phone: client_phone || null,
      client_message: client_message || null,
      duration,
      status: "confirmed",
      zoom_meeting_id: zoomData?.id?.toString() || null,
      zoom_join_url: zoomData?.join_url || null,
      zoom_start_url: zoomData?.start_url || null,
    })
    .select()
    .single();

  if (bookingError) {
    // Revert slot booking
    await supabase
      .from("availability_slots")
      .update({ is_booked: false, updated_at: new Date().toISOString() })
      .eq("id", slot_id);
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 }
    );
  }


  // Deduct mentorship hours from active subscription
  try {
    const adminDb = createAdminClient();
    const { data: activeSub } = await adminDb
      .from("user_subscriptions")
      .select("id, used_hours")
      .eq("client_email", normalizedEmail)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (activeSub) {
      const hoursToDeduct = duration / 60;
      await adminDb
        .from("user_subscriptions")
        .update({ used_hours: activeSub.used_hours + hoursToDeduct, updated_at: new Date().toISOString() })
        .eq("id", activeSub.id);
      console.log("Deducted", hoursToDeduct, "hours from subscription", activeSub.id);

      // Check remaining hours after deduction and send warning email if <= 1
      const { data: updatedSub } = await adminDb
        .from("user_subscriptions")
        .select("remaining_hours")
        .eq("id", activeSub.id)
        .single();

      if (updatedSub && updatedSub.remaining_hours <= 1) {
        try {
          await fetch(`${request.nextUrl.origin}/api/email/send-low-hours`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_name,
              client_email,
              remaining_hours: updatedSub.remaining_hours,
            }),
          });
          console.log("Low-hours warning email triggered for", client_email);
        } catch (emailErr) {
          console.error("Low-hours email trigger failed:", emailErr);
        }
      }
    }
  } catch (e) {
    console.error("Hour deduction failed:", e);
  }

  // Send confirmation email
  try {
    const emailRes = await fetch(`${request.nextUrl.origin}/api/email/send-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: booking.id,
        client_name,
        client_email,
        date: slot.date,
        start_time: slot.start_time,
        duration,
        zoom_join_url: zoomData?.join_url || null,
      }),
    });
    
    const emailResult = await emailRes.json();
    
    if (!emailRes.ok) {
      console.error("âŒ Email sending failed:", emailResult);
    } else {
      console.log("âœ… Email confirmation sent successfully");
    }
  } catch (e) {
    console.error("âŒ Email sending error:", e);
  }

  // Notion calendar automation
  try {
    await fetch(`${request.nextUrl.origin}/api/notion/create-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name,
        client_email,
        date: slot.date,
        start_time: slot.start_time,
        duration,
        zoom_join_url: zoomData?.join_url || null,
      }),
    });
  } catch (e) {
    console.error("Notion event creation failed:", e);
  }

  return NextResponse.json({ booking, zoom: zoomData });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select("*, availability_slots(*)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}
