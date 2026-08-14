import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { recomputeInvoiceStatus, markInstallmentPaid } from "@/lib/invoicing"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
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
  await recomputeInvoiceStatus(invoice_id)
  return NextResponse.json({ installment: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { id, markPaid, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const supabase = createAdminClient()

  if (markPaid) {
    await markInstallmentPaid(id)
    const { data } = await supabase.from("invoice_installments").select().eq("id", id).single()
    return NextResponse.json({ installment: data })
  }

  const allowed = ["amount", "due_date", "status"]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) { if (key in updates) filtered[key] = updates[key] }
  if (filtered.amount) filtered.amount = parseFloat(String(filtered.amount))

  const { data, error } = await supabase.from("invoice_installments").update(filtered).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recomputeInvoiceStatus(data.invoice_id)

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

  if (installment) await recomputeInvoiceStatus(installment.invoice_id)
  return NextResponse.json({ ok: true })
}
