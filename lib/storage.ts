import "server-only"
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/**
 * Private video storage (session recordings, course lesson videos, backtest
 * walkthroughs), backed by a Cloudflare R2 bucket — not Supabase Storage.
 * R2 is S3-compatible, has no per-file size cap tied to a pricing plan (unlike
 * Supabase's project-wide Storage limit, which silently overrides any
 * bucket-level file_size_limit and caps uploads regardless), and has zero
 * egress fees, which matters for video. Access control is unchanged: this
 * bucket is never public — API routes mint short-lived presigned URLs after
 * checking auth/subscription status, same as before.
 */
export const PRIVATE_BUCKET = process.env.R2_BUCKET_NAME || "private-media"

function client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY (and optionally R2_BUCKET_NAME) in your environment variables."
    )
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Newer SDK versions default to signing a checksum requirement into every
    // request (incl. presigned URLs) even when one isn't explicitly asked
    // for. Our browser upload never sends that checksum header, which would
    // fail signature validation on R2. This restores the old behavior:
    // only compute/require a checksum when a command explicitly asks for one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })
}

export async function uploadPrivateFile(key: string, bytes: Buffer, contentType?: string): Promise<void> {
  const s3 = client()
  await s3.send(new PutObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key, Body: bytes, ContentType: contentType }))
}

/**
 * A one-time presigned URL the browser can PUT the file bytes to directly,
 * bypassing our own server entirely. Required for anything beyond a few MB —
 * Vercel serverless functions hard-cap request bodies at ~4.5MB
 * (FUNCTION_PAYLOAD_TOO_LARGE), so routing video uploads through an API route
 * never works past that size regardless of what the route does with the bytes.
 * Content-Type is intentionally NOT baked into the signature so the browser
 * is free to send whatever content-type header it detects for the file.
 */
export async function createPrivateUploadTicket(key: string): Promise<{ signedUrl: string }> {
  const s3 = client()
  const command = new PutObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key })
  // 4 hours — generous enough for a slow connection uploading a long video.
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 60 * 4 })
  return { signedUrl }
}

/** Null if the object is missing or storage is unreachable. */
export async function getPrivateFileSignedUrl(key: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  try {
    const s3 = client()
    const command = new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key })
    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
  } catch (e) {
    console.error("[storage] Failed to sign a playback URL:", e)
    return null
  }
}

export async function deletePrivateFile(key: string): Promise<void> {
  const s3 = client()
  await s3.send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }))
}
