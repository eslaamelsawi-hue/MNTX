"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, RefreshCw } from "lucide-react"
import { StatusPill } from "@/components/admin-status-pill"

type Notification = {
  id: string; client_email: string; title: string; message: string
  type: string; link: string | null; read: boolean; created_at: string
}

const defaultForm = { client_email: "", title: "", message: "", type: "info", link: "", broadcast: false, send_email: false }

export function AdminNotifications() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [saveError, setSaveError] = useState("")

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/notifications")
      const data = await res.json()
      if (data.notifications) setItems(data.notifications)
    } catch (e) { console.error("Failed to fetch notifications:", e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const resetForm = () => { setForm(defaultForm); setSaveError("") }

  const handleSend = async () => {
    setActionLoading("save")
    setSaveError("")
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) {
        setSaveError(result.error || "Failed to send")
        setActionLoading(null)
        return
      }
      setDialogOpen(false)
      resetForm()
      fetchItems()
    } catch (e) {
      setSaveError("Network error - please try again")
      console.error("Failed to send notification:", e)
    }
    setActionLoading(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notification?")) return
    setActionLoading(id)
    try {
      await fetch("/api/admin/notifications?id=" + id, { method: "DELETE" })
      fetchItems()
    } catch (e) { console.error("Failed to delete:", e) }
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Notification</DialogTitle>
                <DialogDescription>Send a message to one client or broadcast to everyone.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="broadcast" className="cursor-pointer">Send to all clients</Label>
                  <Switch id="broadcast" checked={form.broadcast} onCheckedChange={(v) => setForm({ ...form, broadcast: v })} />
                </div>
                {!form.broadcast && (
                  <div>
                    <Label>Client Email *</Label>
                    <Input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} placeholder="client@email.com" />
                  </div>
                )}
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New invoice created" />
                </div>
                <div>
                  <Label>Message *</Label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Link (optional dashboard tab, e.g. &quot;payments&quot;)</Label>
                  <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="payments" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="send_email" className="cursor-pointer">Also send email</Label>
                  <Switch id="send_email" checked={form.send_email} onCheckedChange={(v) => setForm({ ...form, send_email: v })} />
                </div>
                {saveError && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{saveError}</div>}
                <Button onClick={handleSend} disabled={actionLoading === "save" || !form.title || !form.message || (!form.broadcast && !form.client_email)} className="w-full">
                  {actionLoading === "save" ? "Sending..." : "Send"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>
      ) : items.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">No notifications sent yet.</CardContent></Card>
      ) : (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-sm">{n.client_email}</TableCell>
                  <TableCell><div className="font-medium">{n.title}</div><div className="text-xs text-muted-foreground line-clamp-1">{n.message}</div></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{n.type}</Badge></TableCell>
                  <TableCell><StatusPill status={n.read ? "read" : "unread"} /></TableCell>
                  <TableCell className="text-sm">{new Date(n.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={actionLoading === n.id} onClick={() => handleDelete(n.id)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
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
