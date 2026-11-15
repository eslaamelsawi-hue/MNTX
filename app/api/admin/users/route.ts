import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

type AuthUser = {
  id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

/**
 * Every signed-up account, with whatever the app knows about each one.
 *
 * The accounts come from a database function rather than the admin auth API:
 * auth.users isn't exposed through PostgREST, and this project's app key has
 * no admin rights. The function returns identity and activity columns only.
 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = process.env.ADMIN_USERS_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_USERS_TOKEN is not set — the user list can't be read without it." },
      { status: 500 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("admin_list_users", { p_token: token })
  if (error) {
    console.error("[admin/users] list failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users: AuthUser[] = data ?? []
  const emails = users.map((u) => (u.email ?? "").toLowerCase()).filter(Boolean)

  // What each account has with us, so the page is useful on its own rather
  // than a list of email addresses.
  const [subs, bookings, invoices] = await Promise.all([
    supabase.from("user_subscriptions").select("client_email, plan, status, total_hours, used_hours").in("client_email", emails),
    supabase.from("bookings").select("client_email, status").in("client_email", emails),
    supabase.from("invoices").select("client_email, total_amount, status").in("client_email", emails),
  ])

  const byEmail = <T extends { client_email: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>()
    for (const row of rows ?? []) {
      const key = (row.client_email ?? "").toLowerCase()
      map.set(key, [...(map.get(key) ?? []), row])
    }
    return map
  }

  const subsBy = byEmail(subs.data)
  const bookingsBy = byEmail(bookings.data)
  const invoicesBy = byEmail(invoices.data)

  return NextResponse.json({
    users: users.map((u) => {
      const email = (u.email ?? "").toLowerCase()
      const mySubs = subsBy.get(email) ?? []
      const myInvoices = invoicesBy.get(email) ?? []
      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        confirmed: !!u.email_confirmed_at,
        plans: mySubs.map((s) => s.plan),
        activePlans: mySubs.filter((s) => s.status === "active").map((s) => s.plan),
        hoursLeft: mySubs
          .filter((s) => s.status === "active")
          .reduce((sum, s) => sum + Math.max(0, (s.total_hours ?? 0) - (s.used_hours ?? 0)), 0),
        bookings: (bookingsBy.get(email) ?? []).length,
        unpaidInvoices: myInvoices.filter((i) => ["pending", "partially_paid", "overdue"].includes(i.status)).length,
      }
    }),
  })
}
