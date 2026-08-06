import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import path from "node:path"
import crypto from "node:crypto"
import { createPrivateUploadTicket } from "@/lib/storage"

export const runtime = "nodejs"

const ALLOWED = new Set([".mp4", ".mov", ".webm", ".m4v"])
const CONTENT_TYPE: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
}

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/**
 * Mints a signed upload URL for a backtest walkthrough video so the browser
 * can PUT the bytes straight to Supabase Storage — this route never sees the
 * file itself, which is required past ~4.5MB (Vercel's function body limit).
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { filename } = await req.json().catch(() => ({ filename: "" }))
  const ext = path.extname(String(filename || "")).toLowerCase()
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: `Unsupported type ${ext || "(none)"}. Use mp4/mov/webm.` }, { status: 400 })
  }

  const stored = `${crypto.randomUUID().slice(0, 8)}${ext}`
  try {
    const ticket = await createPrivateUploadTicket(`backtests/${stored}`)
    return NextResponse.json({ filename: stored, contentType: CONTENT_TYPE[ext], ...ticket })
  } catch (e) {
    console.error("[admin/backtests/upload-url] failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
