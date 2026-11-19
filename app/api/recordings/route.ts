import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listRecordingsByEmail } from "@/lib/recordings-store"
import { getViewerEmail } from "@/lib/admin-view"

export const runtime = "nodejs"

/** Returns recordings for the LOGGED-IN user only — the email comes from the
 *  authenticated session, so a client can never see anyone else's. */
export async function GET() {
  const viewerEmail = await getViewerEmail()
  if (!viewerEmail) {
    return NextResponse.json({ recordings: [] }, { status: 401 })
  }
  const recordings = await listRecordingsByEmail(viewerEmail)
  return NextResponse.json({ recordings })
}
