import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/notifications"
import { PLAN_PRICES } from "@/lib/plan-pricing"

/**
 * Auto-generates a full-payment invoice (+ email notification) for a plan
 * purchase or admin-created subscription. Best-effort: failures are logged,
 * never thrown, since the subscription/hours grant that triggered this has
 * already succeeded and shouldn't be rolled back over a receipt-keeping step.
 */
export async function createInvoiceForPlan(opts: {
  clientEmail: string
  clientName: string
  plan: string
  amount?: number
  notes?: string
}) {
  const priceInfo = PLAN_PRICES[opts.plan]
  const amount = opts.amount ?? priceInfo?.amount
  if (!amount) return

  const title = priceInfo?.description ?? `Mentix Trading - ${opts.plan}`
  const clientEmail = opts.clientEmail.toLowerCase().trim()
  const today = new Date().toISOString().slice(0, 10)

  const supabase = createAdminClient()
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_email: clientEmail,
      client_name: opts.clientName,
      title,
      total_amount: amount,
      currency: "USD",
      notes: opts.notes || "Auto-generated from subscription purchase.",
    })
    .select()
    .single()
  if (error || !invoice) {
    console.error("[invoicing] Failed to auto-create invoice:", error)
    return
  }

  const { error: instError } = await supabase
    .from("invoice_installments")
    .insert({ invoice_id: invoice.id, amount, due_date: today })
  if (instError) console.error("[invoicing] Failed to auto-create invoice installment:", instError)

  await createNotification({
    clientEmail: invoice.client_email,
    title: "New invoice",
    message: `A new invoice "${invoice.title}" for ${invoice.currency} ${invoice.total_amount} has been added to your account.`,
    type: "invoice",
    link: "payments",
    sendEmail: true,
  })
}
