import "server-only"
import fs from "node:fs"
import path from "node:path"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Admin-managed course grants (the "MNTX ELITE" access list).
 * Primary store is the Supabase `course_access` table. If that table doesn't
 * exist yet (e.g. local dev before running the SQL), we transparently fall back
 * to a JSON file so the feature works out of the box on localhost.
 */

const TABLE = "course_access"
const FILE = path.join(process.cwd(), "data", "course-access.json")

export type Grant = {
  email: string
  plan: string
  granted_at: string
  granted_by?: string | null
  note?: string | null
}

export type Store = "db" | "file"

const norm = (e: string) => e.trim().toLowerCase()

function readFile(): Grant[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as Grant[]
  } catch {
    return []
  }
}
// Serverless platforms (Vercel etc.) ship a read-only filesystem, so this
// fallback only actually works on localhost. Swallow the error rather than
// crash the caller — this store is best-effort once the DB table is missing.
function writeFile(grants: Grant[]) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(grants, null, 2))
  } catch (e) {
    console.error("[course-access-store] local file fallback unavailable:", e)
  }
}

export async function listGrants(): Promise<{ grants: Grant[]; store: Store }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").order("granted_at", { ascending: false })
    if (error) throw error
    return { grants: (data as Grant[]) ?? [], store: "db" }
  } catch {
    return { grants: readFile().sort((a, b) => b.granted_at.localeCompare(a.granted_at)), store: "file" }
  }
}

export async function grantAccess(
  email: string,
  plan: string,
  grantedBy?: string,
  note?: string,
): Promise<{ store: Store }> {
  const e = norm(email)
  const row: Grant = { email: e, plan, granted_at: new Date().toISOString(), granted_by: grantedBy ?? null, note: note ?? null }
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: "email,plan" })
    if (error) throw error
    return { store: "db" }
  } catch {
    const grants = readFile().filter((g) => !(g.email === e && g.plan === plan))
    grants.push(row)
    writeFile(grants)
    return { store: "file" }
  }
}

export async function revokeAccess(email: string, plan: string): Promise<{ store: Store }> {
  const e = norm(email)
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).delete().eq("email", e).eq("plan", plan)
    if (error) throw error
    return { store: "db" }
  } catch {
    writeFile(readFile().filter((g) => !(g.email === e && g.plan === plan)))
    return { store: "file" }
  }
}

/** Is this email on the admin grant list (any plan)? */
export async function isGranted(email: string): Promise<boolean> {
  const e = norm(email)
  if (!e) return false
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("email").ilike("email", e).limit(1)
    if (error) throw error
    return !!(data && data.length)
  } catch {
    return readFile().some((g) => g.email === e)
  }
}
