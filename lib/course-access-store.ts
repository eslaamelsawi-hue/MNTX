import "server-only"
import fs from "node:fs"
import path from "node:path"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Admin-managed course grants. A grant's `course_id` scopes it: "*" means
 * every course (this is what "MNTX ELITE" grants), a real course id means
 * that one course only. Primary store is the Supabase `course_access` table.
 * If that table doesn't exist yet (e.g. local dev before running the SQL),
 * we transparently fall back to a JSON file so the feature works out of the
 * box on localhost.
 */

const TABLE = "course_access"
const FILE = path.join(process.cwd(), "data", "course-access.json")
export const ALL_COURSES = "*"

export type Grant = {
  email: string
  plan: string
  course_id: string
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

/** Blanket (MNTX ELITE, course_id = "*") grants only — the standalone admin panel. */
export async function listGrants(): Promise<{ grants: Grant[]; store: Store }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").eq("course_id", ALL_COURSES).order("granted_at", { ascending: false })
    if (error) throw error
    return { grants: (data as Grant[]) ?? [], store: "db" }
  } catch {
    return {
      grants: readFile().filter((g) => g.course_id === ALL_COURSES).sort((a, b) => b.granted_at.localeCompare(a.granted_at)),
      store: "file",
    }
  }
}

/** Grants scoped to one specific course — the per-course admin panel. */
export async function listGrantsForCourse(courseId: string): Promise<Grant[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").eq("course_id", courseId).order("granted_at", { ascending: false })
    if (error) throw error
    return (data as Grant[]) ?? []
  } catch {
    return readFile().filter((g) => g.course_id === courseId)
  }
}

export async function grantAccess(
  email: string,
  plan: string,
  grantedBy?: string,
  note?: string,
  courseId: string = ALL_COURSES,
): Promise<{ store: Store }> {
  const e = norm(email)
  const row: Grant = { email: e, plan, course_id: courseId, granted_at: new Date().toISOString(), granted_by: grantedBy ?? null, note: note ?? null }
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).upsert(row, { onConflict: "email,plan,course_id" })
    if (error) throw error
    return { store: "db" }
  } catch {
    const grants = readFile().filter((g) => !(g.email === e && g.plan === plan && g.course_id === courseId))
    grants.push(row)
    writeFile(grants)
    return { store: "file" }
  }
}

export async function revokeAccess(email: string, plan: string, courseId: string = ALL_COURSES): Promise<{ store: Store }> {
  const e = norm(email)
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).delete().eq("email", e).eq("plan", plan).eq("course_id", courseId)
    if (error) throw error
    return { store: "db" }
  } catch {
    writeFile(readFile().filter((g) => !(g.email === e && g.plan === plan && g.course_id === courseId)))
    return { store: "file" }
  }
}

/** Does this email have a grant covering this course — either a blanket
 *  (MNTX ELITE) grant, or one scoped to this exact course? */
export async function hasGrant(email: string, courseId: string): Promise<boolean> {
  const e = norm(email)
  if (!e) return false
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("email").ilike("email", e).in("course_id", [ALL_COURSES, courseId]).limit(1)
    if (error) throw error
    return !!(data && data.length)
  } catch {
    return readFile().some((g) => g.email === e && (g.course_id === ALL_COURSES || g.course_id === courseId))
  }
}
