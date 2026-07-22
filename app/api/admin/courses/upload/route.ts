import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

export const runtime = "nodejs"

const MEDIA_DIR = path.join(process.cwd(), "private-media", "course")
const ALLOWED = new Set([".mp4", ".mov", ".webm", ".m4v"])

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: `Unsupported type ${ext || "(none)"}. Use mp4/mov/webm.` }, { status: 400 })
  }

  const filename = `${crypto.randomUUID().slice(0, 8)}${ext}`
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(path.join(MEDIA_DIR, filename), buffer)

  return NextResponse.json({ filename })
}
