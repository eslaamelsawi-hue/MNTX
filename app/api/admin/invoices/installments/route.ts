import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/notifications"
import type { SupabaseClient } from "@supabase/supabase-js"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Recomputes the parent invoice's status from its installments: all paid →
 *  paid; some paid → partially_paid; any unpaid + past due → overdue;
 *  otherwise pending. Never overrides a manually-set 'cancelled' status. */
async function recomputeInvoiceStatus(supabase: SupabaseClient, invoiceId: string) {
  const { data: invoice } = await supabase.from("invoices").select("status").eq("id", invoiceId).single()
  if (!invoice || invoice.status === "cancelled") return

  const { data: installments } = await supabase
    .from("invoice_installments")
    .select("status, due_date")
    .eq("invoice_id", invoiceId)

  if (!installments || installments.length === 0) return

  const today = new Date().toISOString().slice(0, 10)
  const allPaid = installments.every((i) => i.status === "paid")
  const anyPaid = installments.some((i) => i.status === "paid")
  const anyOverdue = installments.some((i) => i.status !== "paid" && i.due_date < today)

  const status = allPaid ? "paid" : anyOverdue ? "overdue" : anyPaid ? "partially_paid" : "pending"
  await supabase.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", invoiceId)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { invoice_id, amount, due_date } = body
  if (!invoice_id || !amount || !due_date) {
    return NextResponse.json({ error: "invoice_id, amount and due_date are required" }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("invoice_installments")
    .insert({ invoice_id, amount: parseFloat(amount), due_date })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recomputeInvoiceStatus(supabase, invoice_id)
  return NextResponse.json({ installment: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { id, markPaid, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const supabase = createAdminClient()
  const allowed = ["amount", "due_date", "status"]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) { if (key in updates) filtered[key] = updates[key] }
  if (filtered.amount) filtered.amount = parseFloat(String(filtered.amount))

  if (markPaid) {
    filtered.status = "paid"
    filtered.paid_at = new Date().toISOString()
  }

  const { data, error } = await supabase.from("invoice_installments").update(filtered).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recomputeInvoiceStatus(supabase, data.invoice_id)

  if (markPaid) {
    const { data: invoice } = await supabase.from("invoices").select("client_email, title").eq("id", data.invoice_id).single()
    if (invoice) {
      await createNotification({
        clientEmail: invoice.client_email,
        title: "Payment received",
        message: `We've recorded your payment of ${data.amount} for "${invoice.title}". Thank you!`,
        type: "invoice",
        link: "payments",
        sendEmail: true,
      })
    }
  }

  return NextResponse.json({ installment: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const supabase = createAdminClient()
  const { data: installment } = await supabase.from("invoice_installments").select("invoice_id").eq("id", id).single()
  const { error } = await supabase.from("invoice_installments").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (installment) await recomputeInvoiceStatus(supabase, installment.invoice_id)
  return NextResponse.json({ ok: true })
}
