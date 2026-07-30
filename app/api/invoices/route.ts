import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Returns invoices for the LOGGED-IN user only — the email comes from the
 *  authenticated session, so a client can never see anyone else's. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ invoices: [] }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("invoices")
    .select("*, invoice_installments(*)")
    .eq("client_email", user.email.toLowerCase().trim())
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
