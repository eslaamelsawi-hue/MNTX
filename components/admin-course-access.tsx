"use client"

import { useEffect, useState } from "react"
import { GraduationCap, Plus, Trash2, RefreshCw, Loader2, Crown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Grant = {
  email: string
  plan: string
  granted_at: string
  granted_by?: string | null
  note?: string | null
}

export function AdminCourseAccess() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [store, setStore] = useState<"db" | "file" | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/course-access")
      const data = await res.json()
      setGrants(data.grants ?? [])
      setStore(data.store ?? null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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
        body: JSON.stringify({ email: val, note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to grant access.")
      } else {
        setEmail("")
        setNote("")
        await load()
      }
    } catch {
      setError("Failed to grant access.")
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (e: string) => {
    if (!confirm(`Revoke MNTX ELITE access for ${e}?`)) return
    try {
      await fetch(`/api/admin/course-access?email=${encodeURIComponent(e)}`, { method: "DELETE" })
      await load()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Crown className="h-5 w-5 text-primary" /> MNTX ELITE — Course Access
        </h2>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Grant form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grant access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="student@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && grant()}
            />
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="sm:max-w-[220px]"
            />
            <Button onClick={grant} disabled={saving} className="gap-1.5 sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Grant
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            The person unlocks the course by entering this exact email on the course page. Access is immediate.
          </p>
        </CardContent>
      </Card>

      {store === "file" && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
          Using a local file store (the <code>course_access</code> table isn&apos;t in Supabase yet). Grants work
          for local testing but won&apos;t persist in production until you create the table — see{" "}
          <code>supabase/course_access.sql</code>.
        </div>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Members{" "}
            <Badge variant="outline" className="ml-1 border-border text-muted-foreground">
              {grants.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : grants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No members yet. Grant access to your first student.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {grants.map((g) => (
                <div key={`${g.email}-${g.plan}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{g.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(g.granted_at).toLocaleDateString()}
                      {g.note ? ` · ${g.note}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => revoke(g.email)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Revoke
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
