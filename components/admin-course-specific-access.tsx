"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Loader2, Users } from "lucide-react"

type Grant = { email: string; granted_at: string; note?: string | null }

/** Per-course access grants — separate from the standalone "MNTX ELITE"
 *  admin panel, which manages blanket (all-courses) grants only. MNTX ELITE
 *  members already see every course; this is for giving one person access
 *  to just this one course. */
export function CourseSpecificAccess({ courseId }: { courseId: string }) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/course-access?courseId=${encodeURIComponent(courseId)}`)
      const data = await res.json()
      setGrants(data.grants ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const grant = async () => {
    setError("")
    const val = email.trim()
    if (!val.includes("@")) {
      setError("Enter a valid email.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/course-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val, courseId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to grant access.")
      } else {
        setEmail("")
        await load()
      }
    } catch {
      setError("Failed to grant access.")
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (e: string) => {
    if (!confirm(`Revoke this course's access for ${e}?`)) return
    try {
      await fetch(`/api/admin/course-access?email=${encodeURIComponent(e)}&courseId=${encodeURIComponent(courseId)}`, { method: "DELETE" })
      await load()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> Access for this course only ({grants.length})
      </div>
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && grant()}
          placeholder="client@email.com"
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={grant} disabled={saving} className="h-8 shrink-0 gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Grant
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : grants.length > 0 && (
        <div className="space-y-1">
          {grants.map((g) => (
            <div key={g.email} className="flex items-center justify-between rounded border border-border/60 bg-card px-2 py-1.5 text-xs">
              <span className="truncate text-foreground">{g.email}</span>
              <button type="button" onClick={() => revoke(g.email)} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">MNTX ELITE members already have access to every course — this is only for giving someone access to just this one.</p>
    </div>
  )
}
