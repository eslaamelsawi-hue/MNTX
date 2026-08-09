"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, RefreshCw, Edit, CalendarX } from "lucide-react"
import { StatusPill } from "@/components/status-pill"

type Sub = {
  id: string; client_email: string; client_name: string; plan: string
  total_hours: number; used_hours: number; remaining_hours: number
  status: string; starts_at: string; expires_at: string | null; notes: string | null; created_at: string
}

const defaultForm = { client_email: "", client_name: "", plan: "starter", total_hours: "4", used_hours: "0", expires_at: "", notes: "" }

export function AdminSubscriptions() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Sub | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [saveError, setSaveError] = useState("")

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/subscriptions")
      const data = await res.json()
      if (data.subscriptions) setSubs(data.subscriptions)
    } catch (e) { console.error("Failed to fetch subs:", e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  const resetForm = () => { setForm(defaultForm); setEditing(null); setSaveError("") }

  const handleSave = async () => {
    setActionLoading("save")
    setSaveError("")
    try {
      let res
      if (editing) {
        res = await fetch("/api/admin/subscriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form, total_hours: parseFloat(form.total_hours), used_hours: parseFloat(form.used_hours) }),
        })
      } else {
        res = await fetch("/api/admin/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, total_hours: parseFloat(form.total_hours) }),
        })
      }
      const result = await res.json()
      if (!res.ok) {
        setSaveError(result.error || "Failed to save")
        setActionLoading(null)
        return
      }
      setDialogOpen(false)
      resetForm()
      fetchSubs()
    } catch (e) {
      setSaveError("Network error - please try again")
      console.error("Failed to save sub:", e)
    }
    setActionLoading(null)
  }

  const handleEdit = (sub: Sub) => {
    setEditing(sub)
    setForm({ client_email: sub.client_email, client_name: sub.client_name, plan: sub.plan, total_hours: String(sub.total_hours), used_hours: String(sub.used_hours), expires_at: sub.expires_at || "", notes: sub.notes || "" })
    setSaveError("")
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subscription?")) return
    setActionLoading(id)
    try {
      await fetch("/api/admin/subscriptions?id=" + id, { method: "DELETE" })
      fetchSubs()
    } catch (e) { console.error("Failed to delete:", e) }
    setActionLoading(null)
  }

  const handleExpire = async (sub: Sub) => {
    if (!confirm(`Mark ${sub.client_name || sub.client_email}'s ${sub.plan} subscription as expired?`)) return
    setActionLoading(sub.id)
    try {
      await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sub.id, status: "expired" }),
      })
      fetchSubs()
    } catch (e) { console.error("Failed to expire subscription:", e) }
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Client Subscriptions</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSubs}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
                <DialogDescription>Manage client mentorship hours and plan details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Client Email *</Label>
                  <Input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} placeholder="client@email.com" />
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Will use email if empty" />
                </div>
                <div>
                  <Label>Plan</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="coaching">Coaching</SelectItem>
                      <SelectItem value="extend-1m">Extend 1 Month</SelectItem>
                      <SelectItem value="extend-2m">Extend 2 Months</SelectItem>
                      <SelectItem value="extend-3m">Extend 3 Months</SelectItem>
                      <SelectItem value="extend-6m">Extend 6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Hours *</Label>
                    <Input type="number" step="0.5" min="0" value={form.total_hours} onChange={(e) => setForm({ ...form, total_hours: e.target.value })} />
                  </div>
                  {editing && <div><Label>Used Hours</Label><Input type="number" step="0.5" min="0" value={form.used_hours} onChange={(e) => setForm({ ...form, used_hours: e.target.value })} /></div>}
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
                {saveError && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{saveError}</div>}
                <Button onClick={handleSave} disabled={actionLoading === "save" || !form.client_email} className="w-full">
                  {actionLoading === "save" ? "Saving..." : editing ? "Update Subscription" : "Create Subscription"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>
      ) : subs.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">No subscriptions yet. Click &quot;Add Subscription&quot; to create one.</CardContent></Card>
      ) : (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Total Hrs</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell><div className="font-medium">{sub.client_name || "-"}</div><div className="text-xs text-muted-foreground">{sub.client_email}</div></TableCell>
                  <TableCell className="capitalize">{sub.plan.replace(/-/g, " ")}</TableCell>
                  <TableCell className="font-mono font-bold tabular-nums">{sub.total_hours}</TableCell>
                  <TableCell className="font-mono font-bold tabular-nums text-orange-400">{sub.used_hours}</TableCell>
                  <TableCell className={`font-mono font-bold tabular-nums ${sub.remaining_hours <= 1 ? "text-red-400" : "text-emerald-400"}`}>{sub.remaining_hours}</TableCell>
                  <TableCell><StatusPill status={sub.status} /></TableCell>
                  <TableCell className="text-sm">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(sub)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                      {sub.status !== "expired" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" disabled={actionLoading === sub.id} onClick={() => handleExpire(sub)}><CalendarX className="mr-1 h-3 w-3" /> Expire</Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={actionLoading === sub.id} onClick={() => handleDelete(sub.id)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
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
