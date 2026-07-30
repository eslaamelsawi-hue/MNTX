import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { newRecordingId, extFromName, contentTypeFor } from "@/lib/recordings-store"
import { createPrivateUploadTicket } from "@/lib/storage"

export const runtime = "nodejs"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

/**
 * Mints a signed upload URL for a new recording so the browser can PUT the
 * video bytes straight to Supabase Storage — this route never sees the file
 * itself, which is required past ~4.5MB (see lib/storage.ts).
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { filename } = await req.json().catch(() => ({ filename: "" }))
  if (!filename) return NextResponse.json({ error: "filename is required" }, { status: 400 })

  const id = newRecordingId()
  const ext = extFromName(filename)
  const video = `${id}.${ext}`
  try {
    const ticket = await createPrivateUploadTicket(`recordings/${video}`)
    return NextResponse.json({ id, video, contentType: contentTypeFor(video), ...ticket })
  } catch (e) {
    console.error("[admin/recordings/upload-url] failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
