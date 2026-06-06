import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Get support tickets for a user
export async function GET(req: NextRequest) {
  const clientEmail = req.nextUrl.searchParams.get("client_email")
  const ticketId = req.nextUrl.searchParams.get("ticket_id")

  if (!clientEmail) {
    return NextResponse.json({ error: "client_email is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (ticketId) {
    // Get specific ticket and messages
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single()

    const { data: messages } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })

    return NextResponse.json({ ticket, messages })
  } else {
    // Get all tickets for user
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("client_email", clientEmail.toLowerCase().trim())
      .order("updated_at", { ascending: false })

    return NextResponse.json({ tickets })
  }
}

// Create ticket or add message
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ticket_id, client_email, client_name, subject, message, is_admin } = body

  const supabase = createAdminClient()

  if (ticket_id) {
    // Add message to existing ticket
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id,
        sender_email: client_email.toLowerCase().trim(),
        message,
        is_admin: is_admin || false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update ticket updated_at
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date() })
      .eq("id", ticket_id)

    return NextResponse.json({ message: data })
  } else {
    // Create new ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        client_email: client_email.toLowerCase().trim(),
        client_name,
        subject,
        status: "open",
      })
      .select()
      .single()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    // Add first message
    const { data: msg, error: msgError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        sender_email: client_email.toLowerCase().trim(),
        message,
        is_admin: false,
      })
      .select()
      .single()

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    return NextResponse.json({ ticket, message: msg })
  }
}
