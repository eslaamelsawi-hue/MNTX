"use client"

import { useEffect, useState } from "react"
import { ClipboardList, Trash2, RefreshCw, Download, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Entry = { id: string; name: string; email: string; phone: string; source: string; created_at: string }

export function AdminWaitlist() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [store, setStore] = useState<"db" | "file" | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/waitlist")
      const data = await res.json()
      setEntries(data.entries ?? [])
      setStore(data.store ?? null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const remove = async (id: string) => {
    if (!confirm("Remove this waitlist entry?")) return
    await fetch(`/api/admin/waitlist?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    await load()
  }

  const exportCsv = () => {
    const header = "Name,Email,Phone,Source,Date\n"
    const rows = entries
      .map((e) => [e.name, e.email, e.phone, e.source, e.created_at].map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "waitlist.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" /> Waitlist
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!entries.length} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {store === "file" && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
          Using a local file store (the <code>waitlist</code> table isn&apos;t in Supabase yet). Entries persist for
          local testing but won&apos;t survive on production until you create the table.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Applicants{" "}
            <Badge variant="outline" className="ml-1 border-border text-muted-foreground">{entries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No waitlist applications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{e.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {e.email}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {e.phone}</span>
                      <span className="font-mono">{new Date(e.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="border-border text-[10px]">{e.source}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(e.id)}>
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
