import fs from "node:fs"
import { createClient } from "@/lib/supabase/server"
import { findRecording, recordingFilePath, contentTypeFor } from "@/lib/recordings-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const norm = (e: string) => e.trim().toLowerCase()

/**
 * Wrap a Node read stream as a web ReadableStream that cleans up when the client
 * aborts (common with video range/seek requests).
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
      nodeStream.on("error", () => {
        if (closed) return
        closed = true
        try { controller.error(new Error("stream error")) } catch { /* already errored */ }
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

  // Must be logged in, and the recording must belong to THIS user's email.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return new Response("Unauthorized", { status: 401 })

  const rec = await findRecording(id)
  if (!rec) return new Response("Not found", { status: 404 })
  if (norm(rec.email) !== norm(user.email)) return new Response("Forbidden", { status: 403 })

  const filePath = recordingFilePath(rec.video)
  if (!fs.existsSync(filePath)) return new Response("Not found", { status: 404 })

  const size = fs.statSync(filePath).size
  const range = request.headers.get("range")

  const baseHeaders: Record<string, string> = {
    "Content-Type": contentTypeFor(rec.video),
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
