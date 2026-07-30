import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { addRecording, listAllRecordings, deleteRecording } from "@/lib/recordings-store"

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

/**
 * Records the metadata row for a recording whose bytes were already PUT
 * directly to Supabase Storage via a signed URL from /upload-url — this body
 * is just { id, email, title, video }, never the video itself.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const id = String(body.id ?? "").trim()
  const email = String(body.email ?? "").trim()
  const title = String(body.title ?? "").trim()
  const video = String(body.video ?? "").trim()

  if (!email.includes("@") || !title) {
    return NextResponse.json({ error: "Valid email and title are required" }, { status: 400 })
  }
  if (!id || !video) {
    return NextResponse.json({ error: "Missing upload reference — try uploading again" }, { status: 400 })
  }

  try {
    const { store } = await addRecording({ id, email, title, video })
    return NextResponse.json({ success: true, store })
  } catch (e) {
    console.error("[admin/recordings] save metadata failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  await deleteRecording(id)
  return NextResponse.json({ success: true })
}
