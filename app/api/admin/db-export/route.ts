import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * TEMPORARY — database export for the migration to a new Supabase project.
 *
 * The old project's dashboard is unreachable (suspended account), so there is
 * no database password and pg_dump can't connect. This reads the database
 * through the service-role key the app already holds, which means the key
 * never has to leave Vercel.
 *
 * Delete this route once the migration is done.
 */
async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/** Every table PostgREST exposes, with its columns — the OpenAPI spec is the
 *  only schema introspection available without a SQL connection. */
async function fetchSpec() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`OpenAPI spec fetch failed (${res.status})`)
  return res.json()
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode")
  const table = searchParams.get("table")

  try {
    // Schema side: table names plus column types, defaults, PKs and FKs.
    if (mode === "schema") {
      const spec = await fetchSpec()
      return NextResponse.json({
        tables: Object.keys(spec.definitions || {}).sort(),
        definitions: spec.definitions || {},
      })
    }

    // Auth users. Password hashes are not retrievable through the admin API,
    // so migrated users will have to reset their passwords.
    if (mode === "auth") {
      const supabase = createAdminClient()
      const page = Number(searchParams.get("page") || "1")
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ page, count: data.users.length, users: data.users })
    }

    // Data side: one page of one table.
    if (table) {
      if (!/^[a-z0-9_]+$/.test(table)) {
        return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
      }
      const offset = Number(searchParams.get("offset") || "0")
      const limit = Math.min(Number(searchParams.get("limit") || "1000"), 1000)
      const supabase = createAdminClient()
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .range(offset, offset + limit - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ table, offset, limit, total: count ?? null, rows: data ?? [] })
    }

    return NextResponse.json(
      { error: "Pass mode=schema, mode=auth, or table=<name>" },
      { status: 400 }
    )
  } catch (e) {
    console.error("[db-export] failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
