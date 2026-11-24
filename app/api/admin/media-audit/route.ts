import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"
import { PRIVATE_BUCKET } from "@/lib/storage"
import { isAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin-view"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * What is actually in media storage, per prefix — the ground truth to check
 * the database's filenames against when a video won't play. Read-only.
 */
export async function GET(request: Request) {
  const store = await cookies()
  if (!isAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 500 })
  }

  const prefix = new URL(request.url).searchParams.get("prefix") ?? ""
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })

  const objects: { key: string; size: number }[] = []
  let token: string | undefined
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: PRIVATE_BUCKET, Prefix: prefix, ContinuationToken: token })
    )
    for (const o of page.Contents ?? []) {
      if (o.Key) objects.push({ key: o.Key, size: o.Size ?? 0 })
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)

  return NextResponse.json({ bucket: PRIVATE_BUCKET, count: objects.length, objects })
}
