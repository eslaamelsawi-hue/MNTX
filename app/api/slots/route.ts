import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { todayCairo, formatDateCairo } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM format
  const date = searchParams.get("date"); // YYYY-MM-DD format

  let query = supabase
    .from("availability_slots")
    .select("*")
    .eq("is_booked", false)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (date) {
    query = query.eq("date", date);
  } else if (month) {
    const startDate = `${month}-01`;
    const [year, mon] = month.split("-").map(Number);
    const endDate = formatDateCairo(new Date(year, mon, 0));
    query = query.gte("date", startDate).lte("date", endDate);
  } else {
    // Default: fetch slots from today onwards (Cairo timezone)
    const today = todayCairo();
    query = query.gte("date", today);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data });
}