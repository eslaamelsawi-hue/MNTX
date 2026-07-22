import "server-only"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Waitlist entries (people applying while enrollment is closed). Primary store is
 * the Supabase `waitlist` table; falls back to a local JSON file if that table
 * doesn't exist yet, so it works out of the box on localhost.
 */

const TABLE = "waitlist"
const FILE = path.join(process.cwd(), "data", "waitlist.json")

export type WaitlistEntry = {
  id: string
  name: string
  email: string
  phone: string
  source: string
  created_at: string
}

export type Store = "db" | "file"

function readFile(): WaitlistEntry[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as WaitlistEntry[]
  } catch {
    return []
  }
}
function writeFile(rows: WaitlistEntry[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2))
}

export async function addWaitlistEntry(input: {
  name: string
  email: string
  phone: string
  source?: string
}): Promise<{ store: Store }> {
  const row: WaitlistEntry = {
    id: crypto.randomUUID().slice(0, 8),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    source: input.source || "propfirm",
    created_at: new Date().toISOString(),
  }
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).insert({
      name: row.name,
      email: row.email,
      phone: row.phone,
      source: row.source,
      created_at: row.created_at,
    })
    if (error) throw error
    return { store: "db" }
  } catch {
    const rows = readFile()
    rows.push(row)
    writeFile(rows)
    return { store: "file" }
  }
}

export async function listWaitlistEntries(): Promise<{ entries: WaitlistEntry[]; store: Store }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false })
    if (error) throw error
    return { entries: (data as WaitlistEntry[]) ?? [], store: "db" }
  } catch {
    return { entries: readFile().sort((a, b) => b.created_at.localeCompare(a.created_at)), store: "file" }
  }
}

export async function deleteWaitlistEntry(id: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).delete().eq("id", id)
    if (error) throw error
  } catch {
    writeFile(readFile().filter((r) => r.id !== id))
  }
}
