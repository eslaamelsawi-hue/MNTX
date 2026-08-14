import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/notifications"
import { PLAN_PRICES } from "@/lib/plan-pricing"

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Auto-generates an invoice (+ email notification) for a plan purchase or
 * admin-created subscription. Best-effort: failures are logged, never
 * thrown, since the subscription/hours grant that triggered this has
 * already succeeded and shouldn't be rolled back over a receipt-keeping step.
 *
 * Pass `split` when the client paid via the "split into 2 payments" option
 * at checkout: the first installment is recorded as already paid (today),
 * the second is `pending` and due 30 days out.
 */
export async function createInvoiceForPlan(opts: {
  clientEmail: string
  clientName: string
  plan: string
  amount?: number
  notes?: string
  split?: { firstAmount: number; secondAmount: number }
}) {
  const priceInfo = PLAN_PRICES[opts.plan]
  const totalAmount = opts.split
    ? Math.round((opts.split.firstAmount + opts.split.secondAmount) * 100) / 100
    : (opts.amount ?? priceInfo?.amount)
  if (!totalAmount) return

  const title = priceInfo?.description ?? `Mentix Trading - ${opts.plan}`
  const clientEmail = opts.clientEmail.toLowerCase().trim()
  const today = addDays(0)

  const supabase = createAdminClient()
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_email: clientEmail,
      client_name: opts.clientName,
      title,
      total_amount: totalAmount,
      currency: "USD",
      plan: opts.plan,
      notes: opts.notes || "Auto-generated from subscription purchase.",
    })
    .select()
    .single()
  if (error || !invoice) {
    console.error("[invoicing] Failed to auto-create invoice:", error)
    return
  }

  if (opts.split) {
    const { error: instError } = await supabase.from("invoice_installments").insert([
      { invoice_id: invoice.id, amount: opts.split.firstAmount, due_date: today, status: "paid", paid_at: new Date().toISOString() },
      { invoice_id: invoice.id, amount: opts.split.secondAmount, due_date: addDays(30), status: "pending" },
    ])
    if (instError) console.error("[invoicing] Failed to auto-create split installments:", instError)
  } else {
    const { error: instError } = await supabase
      .from("invoice_installments")
      .insert({ invoice_id: invoice.id, amount: totalAmount, due_date: today })
    if (instError) console.error("[invoicing] Failed to auto-create invoice installment:", instError)
  }

  const message = opts.split
    ? `A new invoice "${invoice.title}" for ${invoice.currency} ${invoice.total_amount} has been added to your account. You paid ${invoice.currency} ${opts.split.firstAmount} now — the remaining ${invoice.currency} ${opts.split.secondAmount} is due by ${addDays(30)}.`
    : `A new invoice "${invoice.title}" for ${invoice.currency} ${invoice.total_amount} has been added to your account.`

  await createNotification({
    clientEmail: invoice.client_email,
    title: "New invoice",
    message,
    type: "invoice",
    link: "payments",
    sendEmail: true,
  })
}

/** Recomputes the parent invoice's status from its installments: all paid →
 *  paid; some paid → partially_paid; any unpaid + past due → overdue;
 *  otherwise pending. Never overrides a manually-set 'cancelled' status. */
export async function recomputeInvoiceStatus(invoiceId: string) {
  const supabase = createAdminClient()
  const { data: invoice } = await supabase.from("invoices").select("status").eq("id", invoiceId).single()
  if (!invoice || invoice.status === "cancelled") return

  const { data: installments } = await supabase
    .from("invoice_installments")
    .select("status, due_date")
    .eq("invoice_id", invoiceId)

  if (!installments || installments.length === 0) return

  const today = addDays(0)
  const allPaid = installments.every((i) => i.status === "paid")
  const anyPaid = installments.some((i) => i.status === "paid")
  const anyOverdue = installments.some((i) => i.status !== "paid" && i.due_date < today)

  const status = allPaid ? "paid" : anyOverdue ? "overdue" : anyPaid ? "partially_paid" : "pending"
  await supabase.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", invoiceId)
}

/** Marks a single installment paid, recomputes its parent invoice's status,
 *  and notifies the client. Shared by the admin "Mark Paid" action and the
 *  automated pay-installment flow (OKX/NowPayments). */
export async function markInstallmentPaid(installmentId: string) {
  const supabase = createAdminClient()
  const { data: installment, error } = await supabase
    .from("invoice_installments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", installmentId)
    .select()
    .single()
  if (error || !installment) {
    console.error("[invoicing] Failed to mark installment paid:", error)
    return
  }

  await recomputeInvoiceStatus(installment.invoice_id)

  const { data: invoice } = await supabase
    .from("invoices")
    .select("client_email, title, currency")
    .eq("id", installment.invoice_id)
    .single()
  if (invoice) {
    await createNotification({
      clientEmail: invoice.client_email,
      title: "Payment received",
      message: `We've recorded your payment of ${invoice.currency} ${installment.amount} for "${invoice.title}". Thank you!`,
      type: "invoice",
      link: "payments",
      sendEmail: true,
    })
  }
}

/** Runs daily from the expire-subscriptions cron: flips any pending
 *  installment whose due date has passed into an 'overdue' invoice status,
 *  and sends a one-time reminder the day it first becomes overdue (so
 *  clients aren't re-notified every day it stays unpaid). */
export async function markOverdueInstallmentsAndNotify(): Promise<{ overdue: number; notified: number }> {
  const supabase = createAdminClient()
  const today = addDays(0)
  const yesterday = addDays(-1)

  const { data: overdue } = await supabase
    .from("invoice_installments")
    .select("id, invoice_id, amount, due_date")
    .eq("status", "pending")
    .lt("due_date", today)

  if (!overdue || overdue.length === 0) return { overdue: 0, notified: 0 }

  const invoiceIds = Array.from(new Set(overdue.map((i) => i.invoice_id)))
  for (const id of invoiceIds) await recomputeInvoiceStatus(id)

  const justDue = overdue.filter((i) => i.due_date === yesterday)
  let notified = 0
  for (const inst of justDue) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("client_email, title, currency, status")
      .eq("id", inst.invoice_id)
      .single()
    if (!invoice || invoice.status === "cancelled") continue
    await createNotification({
      clientEmail: invoice.client_email,
      title: "Payment overdue",
      message: `Your remaining payment of ${invoice.currency} ${inst.amount} for "${invoice.title}" was due on ${inst.due_date} and is now overdue. Please complete it from the Payments tab.`,
      type: "invoice",
      link: "payments",
      sendEmail: true,
    })
    notified++
  }
  return { overdue: overdue.length, notified }
}
