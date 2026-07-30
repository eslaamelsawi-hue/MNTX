import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/notifications"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_installments(*)")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoices = (data ?? []).map((inv) => ({
    ...inv,
    invoice_installments: (inv.invoice_installments ?? []).sort(
      (a: { due_date: string }, b: { due_date: string }) => a.due_date.localeCompare(b.due_date)
    ),
  }))
  return NextResponse.json({ invoices })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { client_email, client_name, title, total_amount, currency, notes, installments, send_email } = body
  if (!client_email || !title || !total_amount) {
    return NextResponse.json({ error: "client_email, title and total_amount are required" }, { status: 400 })
  }
  if (!Array.isArray(installments) || installments.length === 0) {
    return NextResponse.json({ error: "At least one installment is required" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_email: client_email.toLowerCase().trim(),
      client_name: (client_name || client_email.split("@")[0]).trim(),
      title,
      total_amount: parseFloat(total_amount),
      currency: currency || "USD",
      notes: notes || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: instError } = await supabase.from("invoice_installments").insert(
    installments.map((i: { amount: number | string; due_date: string }) => ({
      invoice_id: invoice.id,
      amount: parseFloat(String(i.amount)),
      due_date: i.due_date,
    }))
  )
  if (instError) return NextResponse.json({ error: instError.message }, { status: 500 })

  await createNotification({
    clientEmail: invoice.client_email,
    title: "New invoice",
    message: `A new invoice "${invoice.title}" for ${invoice.currency} ${invoice.total_amount} has been added to your account.`,
    type: "invoice",
    link: "payments",
    sendEmail: !!send_email,
  })

  return NextResponse.json({ invoice })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const allowed = ["client_name", "client_email", "title", "total_amount", "currency", "status", "notes"]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) { if (key in updates) filtered[key] = updates[key] }
  if (filtered.client_email) filtered.client_email = (filtered.client_email as string).toLowerCase().trim()
  if (filtered.total_amount) filtered.total_amount = parseFloat(String(filtered.total_amount))
  filtered.updated_at = new Date().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase.from("invoices").update(filtered).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
