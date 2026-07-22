import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  addRecording,
  listAllRecordings,
  deleteRecording,
  saveRecordingFile,
  extFromName,
  newRecordingId,
} from "@/lib/recordings-store"

export const runtime = "nodejs"

async function isAdmin() {
  const cookieStore = await cookies()
  return !!cookieStore.get("admin_session")?.value
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { recordings, store } = await listAllRecordings()
  return NextResponse.json({ recordings, store })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Expected a multipart form upload" }, { status: 400 })

  const email = String(form.get("email") ?? "").trim()
  const title = String(form.get("title") ?? "").trim()
  const file = form.get("file")

  if (!email.includes("@") || !title) {
    return NextResponse.json({ error: "Valid email and title are required" }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A video file is required" }, { status: 400 })
  }
  if (file.type && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "That file is not a video" }, { status: 400 })
  }

  const id = newRecordingId()
  const ext = extFromName(file.name)
  const bytes = Buffer.from(await file.arrayBuffer())
  const video = saveRecordingFile(id, ext, bytes)

  const { store } = await addRecording({ id, email, title, video })
  return NextResponse.json({ success: true, store })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  await deleteRecording(id)
  return NextResponse.json({ success: true })
}
