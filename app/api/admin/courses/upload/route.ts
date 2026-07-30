import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import path from "node:path"
import crypto from "node:crypto"
import { uploadPrivateFile } from "@/lib/storage"

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

  try {
    const filename = `${crypto.randomUUID().slice(0, 8)}${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadPrivateFile(`course/${filename}`, buffer, CONTENT_TYPE[ext])
    return NextResponse.json({ filename })
  } catch (e) {
    console.error("[admin/courses/upload] upload failed:", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
