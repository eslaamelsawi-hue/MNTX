import { NextResponse } from "next/server"
import path from "node:path"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const BUCKET = "avatars"
const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  // Must be logged in.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }
  const ext = (path.extname(file.name).toLowerCase() || ".jpg").replace(".jpeg", ".jpg")
  if (!ALLOWED.has(ext) && !ALLOWED.has(path.extname(file.name).toLowerCase())) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Ensure the public avatars bucket exists (no-op if it already does).
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const key = `${user.id}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(key, buffer, { upsert: true, contentType: file.type || "image/jpeg" })
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key)
  const url = `${pub.publicUrl}?v=${Date.now()}` // cache-bust after re-upload

  // Merge avatar_url into the account metadata (keeps name/phone).
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: url },
  })

  return NextResponse.json({ url })
}
