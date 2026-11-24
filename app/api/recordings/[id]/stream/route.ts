import { NextResponse } from "next/server"
import { findRecording, getRecordingUrl } from "@/lib/recordings-store"
import { getViewerEmail } from "@/lib/admin-view"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const norm = (e: string) => e.trim().toLowerCase()

/**
 * Verifies the recording belongs to the logged-in user, then redirects to a
 * short-lived signed URL from Supabase Storage — the browser's <video> element
 * follows the redirect transparently (including for Range/seek requests), so
 * we don't need to proxy video bytes through this function.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // The signed-in client, or the account an admin is viewing from the Users
  // page — the same resolution the rest of the dashboard's reads use.
  const viewerEmail = await getViewerEmail()
  if (!viewerEmail) return new Response("Unauthorized", { status: 401 })

  const rec = await findRecording(id)
  if (!rec) return new Response("Not found", { status: 404 })
  if (norm(rec.email) !== norm(viewerEmail)) return new Response("Forbidden", { status: 403 })

  const url = await getRecordingUrl(rec.video)
  if (!url) return new Response("Not found", { status: 404 })

  return NextResponse.redirect(url, { status: 302 })
}
