import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { email, slot_date } = await req.json()
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = createAdminClient()
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("id, remaining_hours, total_hours, used_hours, plan, status")
    .eq("client_email", normalizedEmail)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!sub || sub.remaining_hours <= 0) {
    return NextResponse.json({ allowed: false, remaining_hours: 0 })
  }

  if (slot_date) {
    const slotDate = new Date(`${slot_date}T00:00:00Z`)
    const dayOfWeek = slotDate.getUTCDay()
    const daysSinceMonday = (dayOfWeek + 6) % 7
    const weekStartDate = new Date(slotDate)
    weekStartDate.setUTCDate(slotDate.getUTCDate() - daysSinceMonday)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6)

    const weekStart = weekStartDate.toISOString().split("T")[0]
    const weekEnd = weekEndDate.toISOString().split("T")[0]

    const { data: weeklyBookings } = await supabase
      .from("bookings")
      .select("id, availability_slots!inner(date)")
      .eq("client_email", normalizedEmail)
      .in("status", ["confirmed", "completed"])
      .gte("availability_slots.date", weekStart)
      .lte("availability_slots.date", weekEnd)

    if ((weeklyBookings?.length || 0) >= 2) {
      return NextResponse.json({ allowed: false, remaining_hours: sub.remaining_hours, weekly_limit_reached: true })
    }
  }

  return NextResponse.json({ allowed: true, remaining_hours: sub.remaining_hours, plan: sub.plan })
}