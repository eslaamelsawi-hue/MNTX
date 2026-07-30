import "server-only"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPrivateFileSignedUrl, deletePrivateFile } from "@/lib/storage"

/**
 * Session recordings, each tied to a client's email. Video bytes are PUT
 * directly from the browser to the private-media Supabase Storage bucket
 * (see /api/admin/recordings/upload-url) — never local disk, and never
 * through this server, since Vercel caps function request bodies at ~4.5MB.
 * Metadata is stored in the Supabase `recordings` table, falling back to a
 * local JSON file so it works on localhost before the table exists.
 */

const TABLE = "recordings"
const FILE = path.join(process.cwd(), "data", "recordings.json")
const storageKey = (video: string) => `recordings/${path.basename(video)}`

export type Recording = {
  id: string
  email: string
  title: string
  /** filename in private-media/recordings/, e.g. "a1b2c3d4.mp4" */
  video: string
  created_at: string
}

export type Store = "db" | "file"

const norm = (e: string) => e.trim().toLowerCase()

const ALLOWED_EXT = ["mp4", "webm", "mov", "m4v", "mkv"] as const
export function extFromName(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  return (ALLOWED_EXT as readonly string[]).includes(ext) ? ext : "mp4"
}
export function contentTypeFor(video: string): string {
  const ext = video.split(".").pop()?.toLowerCase()
  if (ext === "webm") return "video/webm"
  if (ext === "mov" || ext === "m4v") return "video/quicktime"
  if (ext === "mkv") return "video/x-matroska"
  return "video/mp4"
}

export function newRecordingId(): string {
  return crypto.randomUUID().slice(0, 8)
}

/** Short-lived signed URL for streaming; null if missing or storage is unreachable. */
export async function getRecordingUrl(video: string): Promise<string | null> {
  return getPrivateFileSignedUrl(storageKey(video))
}

function readFile(): Recording[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as Recording[]
  } catch {
    return []
  }
}
function writeFile(rows: Recording[]) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(rows, null, 2))
  } catch (e) {
    console.error("[recordings-store] local file fallback unavailable:", e)
  }
}

export async function addRecording(input: {
  id: string
  email: string
  title: string
  video: string
}): Promise<{ store: Store }> {
  const row: Recording = {
    id: input.id,
    email: norm(input.email),
    title: input.title.trim(),
    video: input.video,
    created_at: new Date().toISOString(),
  }
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).insert({
      id: row.id,
      email: row.email,
      title: row.title,
      video: row.video,
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

/** One recording by id — used by the streaming route to check ownership. */
export async function findRecording(id: string): Promise<Recording | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle()
    if (error) throw error
    if (data) return data as Recording
  } catch {
    /* fall through to file store */
  }
  return readFile().find((r) => r.id === id) ?? null
}

/** Recordings for one client — used by the client dashboard (their own email only). */
export async function listRecordingsByEmail(email: string): Promise<Recording[]> {
  const e = norm(email)
  if (!e) return []
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").ilike("email", e).order("created_at", { ascending: false })
    if (error) throw error
    return (data as Recording[]) ?? []
  } catch {
    return readFile()
      .filter((r) => r.email === e)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
}

/** All recordings — admin only. */
export async function listAllRecordings(): Promise<{ recordings: Recording[]; store: Store }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false })
    if (error) throw error
    return { recordings: (data as Recording[]) ?? [], store: "db" }
  } catch {
    return { recordings: readFile().sort((a, b) => b.created_at.localeCompare(a.created_at)), store: "file" }
  }
}

export async function deleteRecording(id: string): Promise<void> {
  const existing = await findRecording(id)
  if (existing?.video) {
    try {
      await deletePrivateFile(storageKey(existing.video))
    } catch {
      /* file may already be gone */
    }
  }
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).delete().eq("id", id)
    if (error) throw error
  } catch {
    writeFile(readFile().filter((r) => r.id !== id))
  }
}
