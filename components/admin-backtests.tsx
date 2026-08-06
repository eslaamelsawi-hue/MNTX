"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import { Plus, Trash2, RefreshCw, Edit, Eye, EyeOff, Upload, LineChart, FileVideo, X } from "lucide-react"

type Trade = { date: string; direction: "buy" | "sell"; entry: string; exit: string; pnl: string; result: "win" | "loss" | "be" }
type Backtest = {
  id: string; title: string; description: string | null; symbol: string; timeframe: string
  period_start: string | null; period_end: string | null
  win_rate: number | null; total_trades: number; profit_factor: number | null
  net_profit_pct: number | null; max_drawdown_pct: number | null
  cover_image_url: string | null; video: string | null; trades: Trade[]; published: boolean
  view_count: number; created_at: string
}

const defaultForm = {
  title: "", description: "", symbol: "", timeframe: "H1",
  period_start: "", period_end: "",
  win_rate: "", profit_factor: "", net_profit_pct: "", max_drawdown_pct: "",
  cover_image_url: "", video: "", published: false,
}
const emptyTrade: Trade = { date: new Date().toISOString().slice(0, 10), direction: "buy", entry: "", exit: "", pnl: "", result: "win" }

/**
 * PUT the file bytes straight to Supabase Storage using a signed URL — this
 * never touches our own server, which matters because Vercel caps serverless
 * function request bodies at ~4.5MB regardless of what the route does with
 * them. fetch() doesn't expose upload progress, so XHR.
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

export function AdminBacktests() {
  const [backtests, setBacktests] = useState<Backtest[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Backtest | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [trades, setTrades] = useState<Trade[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoError, setVideoError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [saveError, setSaveError] = useState("")

  const fetchBacktests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/backtests")
      const data = await res.json()
      if (data.backtests) setBacktests(data.backtests)
    } catch (e) { console.error("Failed to fetch backtests:", e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBacktests() }, [fetchBacktests])

  const resetForm = () => {
    setForm(defaultForm)
    setTrades([])
    setEditing(null)
    setSaveError("")
  }

  const handleSave = async () => {
    setActionLoading("save")
    setSaveError("")
    try {
      const payload = {
        ...form,
        win_rate: form.win_rate ? parseFloat(form.win_rate) : null,
        profit_factor: form.profit_factor ? parseFloat(form.profit_factor) : null,
        net_profit_pct: form.net_profit_pct ? parseFloat(form.net_profit_pct) : null,
        max_drawdown_pct: form.max_drawdown_pct ? parseFloat(form.max_drawdown_pct) : null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        trades,
      }
      const res = editing
        ? await fetch("/api/admin/backtests", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id, ...payload }),
          })
        : await fetch("/api/admin/backtests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const result = await res.json()
      if (!res.ok) {
        setSaveError(result.error || "Failed to save")
        setActionLoading(null)
        return
      }
      setDialogOpen(false)
      resetForm()
      fetchBacktests()
    } catch (e) {
      setSaveError("Network error - please try again")
      console.error("Failed to save backtest:", e)
    }
    setActionLoading(null)
  }

  const handleEdit = (bt: Backtest) => {
    setEditing(bt)
    setForm({
      title: bt.title, description: bt.description || "", symbol: bt.symbol, timeframe: bt.timeframe,
      period_start: bt.period_start || "", period_end: bt.period_end || "",
      win_rate: bt.win_rate?.toString() || "", profit_factor: bt.profit_factor?.toString() || "",
      net_profit_pct: bt.net_profit_pct?.toString() || "", max_drawdown_pct: bt.max_drawdown_pct?.toString() || "",
      cover_image_url: bt.cover_image_url || "", video: bt.video || "", published: bt.published,
    })
    setTrades(bt.trades || [])
    setSaveError("")
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this backtest report?")) return
    setActionLoading(id)
    try {
      await fetch("/api/admin/backtests?id=" + id, { method: "DELETE" })
      fetchBacktests()
    } catch (e) { console.error("Failed to delete:", e) }
    setActionLoading(null)
  }

  const handleTogglePublished = async (bt: Backtest) => {
    setActionLoading(bt.id)
    try {
      await fetch("/api/admin/backtests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bt.id, published: !bt.published }),
      })
      fetchBacktests()
    } catch (e) { console.error("Failed to toggle published:", e) }
    setActionLoading(null)
  }

  const updateTrade = (i: number, patch: Partial<Trade>) => {
    setTrades((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <LineChart className="h-5 w-5 text-primary" /> Strategy Backtests
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBacktests}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> New Backtest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Backtest" : "New Backtest"}</DialogTitle>
                <DialogDescription>Publish a strategy backtest report for premium clients.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. EURUSD Order Block Strategy" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Strategy rules, entry/exit criteria, notes..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Symbol *</Label>
                    <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="EURUSD, US30, XAUUSD..." />
                  </div>
                  <div>
                    <Label>Timeframe *</Label>
                    <Select value={form.timeframe} onValueChange={(v) => setForm({ ...form, timeframe: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["M5", "M15", "M30", "H1", "H4", "D1", "W1"].map((tf) => (
                          <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
                  <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div><Label className="text-xs">Win Rate %</Label><Input type="number" step="0.1" value={form.win_rate} onChange={(e) => setForm({ ...form, win_rate: e.target.value })} /></div>
                  <div><Label className="text-xs">Profit Factor</Label><Input type="number" step="0.01" value={form.profit_factor} onChange={(e) => setForm({ ...form, profit_factor: e.target.value })} /></div>
                  <div><Label className="text-xs">Net Profit %</Label><Input type="number" step="0.1" value={form.net_profit_pct} onChange={(e) => setForm({ ...form, net_profit_pct: e.target.value })} /></div>
                  <div><Label className="text-xs">Max Drawdown %</Label><Input type="number" step="0.1" value={form.max_drawdown_pct} onChange={(e) => setForm({ ...form, max_drawdown_pct: e.target.value })} /></div>
                </div>

                <div>
                  <Label className="mb-1.5 block">Cover Image</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return }
                        setUploadingImage(true)
                        try {
                          const fd = new FormData()
                          fd.append("file", file)
                          const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
                          const data = await res.json()
                          if (!res.ok) { alert("Upload failed: " + (data.error ?? "Unknown error")); return }
                          setForm((f) => ({ ...f, cover_image_url: data.url }))
                        } catch (err) {
                          console.error("Upload error:", err)
                          alert("Upload failed. Check console.")
                        } finally {
                          setUploadingImage(false)
                        }
                      }}
                      className="flex-1"
                    />
                    {uploadingImage && <div className="flex items-center text-xs text-muted-foreground"><Upload className="mr-1 h-4 w-4 animate-pulse" /> Uploading...</div>}
                  </div>
                  {form.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.cover_image_url} alt="" className="mt-2 h-24 w-full rounded object-cover" />
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block">Walkthrough Video (optional)</Label>
                  {form.video ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <FileVideo className="h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{form.video}</span>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setForm((f) => ({ ...f, video: "" }))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
                      disabled={uploadingVideo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setVideoError("")
                        setUploadingVideo(true)
                        setVideoProgress(0)
                        try {
                          const ticketRes = await fetch("/api/admin/backtests/upload-url", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ filename: file.name }),
                          })
                          const ticket = await ticketRes.json().catch(() => ({}))
                          if (!ticketRes.ok) { setVideoError(ticket.error || "Could not start the upload"); return }
                          await putWithProgress(ticket.signedUrl, file, ticket.contentType || file.type || "video/mp4", setVideoProgress)
                          setForm((f) => ({ ...f, video: ticket.filename }))
                        } catch (err) {
                          console.error("Video upload error:", err)
                          setVideoError("Upload failed. Please try again.")
                        } finally {
                          setUploadingVideo(false)
                        }
                      }}
                    />
                  )}
                  {uploadingVideo && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all" style={{ width: `${videoProgress}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Uploading… {videoProgress}%</p>
                    </div>
                  )}
                  {videoError && <p className="mt-1 text-xs text-red-400">{videoError}</p>}
                </div>

                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Trades ({trades.length})</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setTrades([...trades, { ...emptyTrade }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add trade
                    </Button>
                  </div>
                  {trades.length > 0 && (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {trades.map((tr, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5">
                          <Input type="date" className="w-36" value={tr.date} onChange={(e) => updateTrade(i, { date: e.target.value })} />
                          <Select value={tr.direction} onValueChange={(v) => updateTrade(i, { direction: v as Trade["direction"] })}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="sell">Sell</SelectItem></SelectContent>
                          </Select>
                          <Input type="number" step="0.00001" placeholder="Entry" className="w-24" value={tr.entry} onChange={(e) => updateTrade(i, { entry: e.target.value })} />
                          <Input type="number" step="0.00001" placeholder="Exit" className="w-24" value={tr.exit} onChange={(e) => updateTrade(i, { exit: e.target.value })} />
                          <Input type="number" step="0.01" placeholder="P/L %" className="w-20" value={tr.pnl} onChange={(e) => updateTrade(i, { pnl: e.target.value })} />
                          <Select value={tr.result} onValueChange={(v) => updateTrade(i, { result: v as Trade["result"] })}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="win">Win</SelectItem><SelectItem value="loss">Loss</SelectItem><SelectItem value="be">B/E</SelectItem></SelectContent>
                          </Select>
                          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setTrades(trades.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="bt-published" className="cursor-pointer">Published (visible to premium clients)</Label>
                  <input id="bt-published" type="checkbox" className="h-4 w-4" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                </div>

                {saveError && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{saveError}</div>}
                <Button onClick={handleSave} disabled={actionLoading === "save" || !form.title || !form.symbol} className="w-full">
                  {actionLoading === "save" ? "Saving..." : editing ? "Update Backtest" : "Create Backtest"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>
      ) : backtests.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">No backtests yet. Click &quot;New Backtest&quot; to publish your first report.</CardContent></Card>
      ) : (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Trades</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backtests.map((bt) => (
                <TableRow key={bt.id}>
                  <TableCell className="font-medium">{bt.title}</TableCell>
                  <TableCell className="font-mono">{bt.symbol}</TableCell>
                  <TableCell>{bt.timeframe}</TableCell>
                  <TableCell className="font-mono tabular-nums">{bt.win_rate != null ? `${bt.win_rate}%` : "-"}</TableCell>
                  <TableCell className="font-mono tabular-nums">{bt.total_trades}</TableCell>
                  <TableCell className="font-mono tabular-nums">{bt.view_count}</TableCell>
                  <TableCell><StatusPill status={bt.published ? "published" : "draft"} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === bt.id} onClick={() => handleTogglePublished(bt)}>
                        {bt.published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(bt)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={actionLoading === bt.id} onClick={() => handleDelete(bt.id)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
