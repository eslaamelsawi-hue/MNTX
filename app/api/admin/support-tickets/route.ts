import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Get all support tickets
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets })
}

// Close/update ticket
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticketId = searchParams.get("id") || req.nextUrl.pathname.split("/").pop()
  const body = await req.json()

  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("support_tickets")
    .update({ status: body.status, updated_at: new Date() })
    .eq("id", ticketId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ticket: data })
}
