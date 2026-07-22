import { cookies } from "next/headers"
import fs from "node:fs"
import path from "node:path"
import { findLesson } from "@/lib/course-store"
import { verifyAccessToken, COURSE_COOKIE } from "@/lib/course-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MEDIA_DIR = path.join(process.cwd(), "private-media", "course")

/**
 * Wrap a Node read stream as a web ReadableStream that cleans up when the client
 * aborts (common with video range/seek requests) — avoids "Controller is already
 * closed" uncaught exceptions.
 */
function toWebStream(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  let closed = false
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        if (closed) return
        try {
          controller.enqueue(chunk as Uint8Array)
        } catch {
          closed = true
          nodeStream.destroy()
        }
      })
      nodeStream.on("end", () => {
        if (closed) return
        closed = true
        try { controller.close() } catch { /* already closed */ }
      })
      nodeStream.on("error", (err) => {
        if (closed) return
        closed = true
        try { controller.error(err) } catch { /* already errored */ }
      })
    },
    cancel() {
      closed = true
      nodeStream.destroy()
    },
  })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await findLesson(id)
  if (!found) return new Response("Not found", { status: 404 })
  const lesson = found.lesson

  // Free-preview lessons stream to anyone; everything else needs a valid access cookie.
  if (!lesson.freePreview) {
    const cookieStore = await cookies()
    const email = verifyAccessToken(cookieStore.get(COURSE_COOKIE)?.value)
    if (!email) return new Response("Forbidden", { status: 403 })
  }

  // Resolve the file safely (filename comes from the store, never raw user input).
  if (!lesson.video) return new Response("Not found", { status: 404 })
  const filePath = path.join(MEDIA_DIR, path.basename(lesson.video))
  if (!filePath.startsWith(MEDIA_DIR) || !fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 })
  }

  const size = fs.statSync(filePath).size
  const range = request.headers.get("range")

  const baseHeaders: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Content-Disposition": "inline",
  }

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range)
    const start = match ? parseInt(match[1], 10) : 0
    const end = match && match[2] ? parseInt(match[2], 10) : size - 1
    if (start >= size || end >= size || start > end) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      })
    }
    const stream = fs.createReadStream(filePath, { start, end })
    return new Response(toWebStream(stream), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    })
  }

  const stream = fs.createReadStream(filePath)
  return new Response(toWebStream(stream), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  })
}
