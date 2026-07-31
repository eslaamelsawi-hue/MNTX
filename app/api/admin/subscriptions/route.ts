import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/notifications"
import { PLAN_PRICES } from "@/lib/plan-pricing"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Auto-generates a full-payment invoice for a newly created subscription,
 *  priced from the plan's known rate. Best-effort: a failure here shouldn't
 *  fail subscription creation, since the subscription already succeeded. */
async function createInvoiceForSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  sub: { client_email: string; client_name: string; plan: string }
) {
  const priceInfo = PLAN_PRICES[sub.plan]
  if (!priceInfo) return

  const today = new Date().toISOString().slice(0, 10)
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_email: sub.client_email,
      client_name: sub.client_name,
      title: priceInfo.description,
      total_amount: priceInfo.amount,
      currency: "USD",
      notes: "Auto-generated from subscription creation.",
    })
    .select()
    .single()
  if (error || !invoice) {
    console.error("[subscriptions] Failed to auto-create invoice:", error)
    return
  }

  const { error: instError } = await supabase
    .from("invoice_installments")
    .insert({ invoice_id: invoice.id, amount: priceInfo.amount, due_date: today })
  if (instError) console.error("[subscriptions] Failed to auto-create invoice installment:", instError)

  await createNotification({
    clientEmail: invoice.client_email,
    title: "New invoice",
    message: `A new invoice "${invoice.title}" for ${invoice.currency} ${invoice.total_amount} has been added to your account.`,
    type: "invoice",
    link: "payments",
    sendEmail: true,
  })
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscriptions: data })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { client_email, client_name, plan, total_hours, expires_at, notes } = body
  if (!client_email || !plan) return NextResponse.json({ error: "client_email and plan are required" }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("user_subscriptions").insert({
    client_email: client_email.toLowerCase().trim(),
    client_name: (client_name || client_email.split("@")[0]).trim(),
    plan,
    total_hours: total_hours || 4,
    used_hours: 0,
    expires_at: expires_at || null,
    notes: notes || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await createInvoiceForSubscription(supabase, data)

  return NextResponse.json({ subscription: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const allowed = ["client_name", "client_email", "plan", "total_hours", "used_hours", "status", "expires_at", "notes"]
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) { if (key in updates) filtered[key] = updates[key] }
  if (filtered.client_email) filtered.client_email = (filtered.client_email as string).toLowerCase().trim()
  filtered.updated_at = new Date().toISOString()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("user_subscriptions").update(filtered).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from("user_subscriptions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
