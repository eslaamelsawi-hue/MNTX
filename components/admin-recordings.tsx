"use client"

import { useEffect, useRef, useState } from "react"
import { Video, Upload, Trash2, RefreshCw, Loader2, FileVideo } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Recording = { id: string; email: string; title: string; video: string; created_at: string }

export function AdminRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [store, setStore] = useState<"db" | "file" | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/recordings")
      const data = await res.json()
      setRecordings(data.recordings ?? [])
      setStore(data.store ?? null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  /**
   * PUT the file bytes straight to Supabase Storage using a signed URL — this
   * never touches our own server, which matters because Vercel caps
   * serverless function request bodies at ~4.5MB regardless of what the
   * route does with them. fetch() doesn't expose upload progress, so XHR.
   */
  const putWithProgress = (
    url: string,
    file: File,
    contentType: string,
    onProgress: (pct: number) => void
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", contentType)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error("Network error"))
      xhr.send(file)
    })

  const add = async () => {
    setError("")
    if (!email.includes("@") || !title.trim()) {
      setError("Enter the client's email and a title.")
      return
    }
    if (!file) {
      setError("Choose a video file to upload.")
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      // 1. Get a signed upload URL for this file.
      const ticketRes = await fetch("/api/admin/recordings/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      })
      const ticket = await ticketRes.json().catch(() => ({}))
      if (!ticketRes.ok) {
        setError(ticket.error || "Could not start the upload")
        return
      }

      // 2. Upload the video bytes directly to storage (bypasses our server).
      await putWithProgress(ticket.signedUrl, file, ticket.contentType || file.type || "video/mp4", setProgress)

      // 3. Record the (tiny) metadata now that the file is in place.
      const res = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticket.id, email, title, video: ticket.video }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Upload failed")
        return
      }
      setEmail("")
      setTitle("")
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this recording?")) return
    await fetch(`/api/admin/recordings?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    await load()
  }

  const mb = (n: number | null) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : "")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Video className="h-5 w-5 text-primary" /> Recordings
        </h2>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload a recording for a client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input type="email" placeholder="client@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Title (e.g. Session — Jul 5)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <FileVideo className="h-4 w-4" /> {file ? "Change video" : "Choose video"}
            </Button>
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name} <span className="text-xs">({mb(file.size)})</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={add} disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? `Uploading… ${progress}%` : "Upload recording"}
            </Button>
            {uploading && (
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            The video plays privately in the client&apos;s dashboard (protected player with their email watermarked over
            it) only when they log in with this exact email. MP4 is the safest format for in-browser playback.
          </p>
        </CardContent>
      </Card>

      {store === "file" && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
          Recording metadata is falling back to a local file instead of the database — the <code>recordings</code> table
          may be missing in Supabase. This won&apos;t persist correctly in production; run
          scripts/093_create_recordings.sql.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All recordings{" "}
            <Badge variant="outline" className="ml-1 border-border text-muted-foreground">{recordings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : recordings.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No recordings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recordings.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{r.email}</span>
                      <span className="font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FileVideo className="h-3 w-3" /> {r.video}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
