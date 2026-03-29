import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SITE_TIMEZONE, todayCairo } from "@/lib/timezone";

export async function GET() {
  const supabase = await createClient();
  
  const { data: slots, error } = await supabase
    .from("availability_slots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const cairoDate = todayCairo();
  const utcDate = now.toISOString().split("T")[0];

  return NextResponse.json({
    serverInfo: {
      siteTimezone: SITE_TIMEZONE,
      cairoDate,
      utcDate,
      serverTime: now.toISOString(),
    },
    recentSlots: slots?.map(slot => ({
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      is_booked: slot.is_booked,
    })) || []
  });
}