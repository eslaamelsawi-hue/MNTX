import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { todayCairo } from "@/lib/timezone";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { slots } = body;

  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: "Slots array is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("availability_slots")
    .insert(
      slots.map((s: { date: string; start_time: string; end_time: string; duration: number }) => ({
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        duration: s.duration,
        is_booked: false,
      }))
    )
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data });
}

export async function GET() {
  const supabase = await createClient();
  const today = todayCairo();

  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const deleteAll = searchParams.get("all");

  if (deleteAll === "true") {
    const { error } = await supabase
      .from("availability_slots")
      .delete()
      .eq("is_booked", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "All available slots deleted" });
  }

  if (!id) {
    return NextResponse.json({ error: "Slot ID is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", id)
    .eq("is_booked", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
