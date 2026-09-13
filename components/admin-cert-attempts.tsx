"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import { RefreshCw, Loader2 } from "lucide-react"

type Attempt = {
  id: string
  client_email: string
  client_name: string
  status: "trading" | "graded_passed" | "graded_failed"
  started_at: string
  ends_at: string
  quiz_score_percent: number | null
  trading_pnl_percent: number | null
  passed: boolean | null
}

export function AdminCertAttempts() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/certification/attempts")
      const data = await res.json()
      setAttempts(data.attempts ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const forceFinalize = async (id: string) => {
    if (!confirm("Force-finalize this attempt now? This closes any open positions at the current price and grades it.")) return
    setFinalizing(id)
    try {
      const res = await fetch("/api/admin/certification/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: id }),
      })
      const data = await res.json()
      if (!res.ok) alert(data.error || "Failed to finalize")
      await load()
    } finally {
      setFinalizing(null)
    }
  }

  const statusLabel = (a: Attempt) => (a.status === "trading" ? "In progress" : a.status === "graded_passed" ? "passed" : "failed")

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Certification Test Attempts</h3>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : attempts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No test attempts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Trading P/L</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{a.client_name}</div>
                    <div className="text-xs text-muted-foreground">{a.client_email}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(a.started_at).toLocaleDateString()} → {new Date(a.ends_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{a.quiz_score_percent != null ? `${Math.round(a.quiz_score_percent)}%` : "—"}</TableCell>
                  <TableCell className={`font-mono text-sm ${a.trading_pnl_percent != null ? (a.trading_pnl_percent >= 5 ? "text-emerald-400" : "text-red-400") : ""}`}>
                    {a.trading_pnl_percent != null ? `${a.trading_pnl_percent.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell><StatusPill status={statusLabel(a)} /></TableCell>
                  <TableCell>
                    {a.status === "trading" && new Date(a.ends_at) < new Date() && (
                      <Button size="sm" variant="outline" disabled={finalizing === a.id} onClick={() => forceFinalize(a.id)}>
                        {finalizing === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Finalize"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
