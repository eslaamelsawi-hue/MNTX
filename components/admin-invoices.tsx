"use client"

import { Fragment, useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, RefreshCw, Edit, ChevronDown, ChevronRight, CheckCircle2, Wallet, CalendarClock } from "lucide-react"
import { StatusPill } from "@/components/admin-status-pill"

type Installment = { id: string; invoice_id: string; amount: number; due_date: string; status: string; paid_at: string | null }
type Invoice = {
  id: string; client_email: string; client_name: string; title: string
  total_amount: number; currency: string; status: string; notes: string | null
  created_at: string; invoice_installments: Installment[]
}

const defaultForm = { client_email: "", client_name: "", title: "", total_amount: "", currency: "USD", notes: "", send_email: true }
const defaultSplit = { count: "1", start_date: new Date().toISOString().slice(0, 10) }

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [paymentType, setPaymentType] = useState<"full" | "installments">("full")
  const [rows, setRows] = useState<{ amount: string; due_date: string }[]>([{ amount: "", due_date: new Date().toISOString().slice(0, 10) }])
  const [split, setSplit] = useState(defaultSplit)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [saveError, setSaveError] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [rowEdits, setRowEdits] = useState<Record<string, { amount: string; due_date: string }>>({})
  const [newInstallment, setNewInstallment] = useState<Record<string, { amount: string; due_date: string }>>({})

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/invoices")
      const data = await res.json()
      if (data.invoices) setInvoices(data.invoices)
    } catch (e) { console.error("Failed to fetch invoices:", e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const resetForm = () => {
    setForm(defaultForm)
    setPaymentType("full")
    setRows([{ amount: "", due_date: new Date().toISOString().slice(0, 10) }])
    setSplit(defaultSplit)
    setEditing(null)
    setSaveError("")
  }

  const applySplit = () => {
    const n = Math.max(1, parseInt(split.count) || 1)
    const total = parseFloat(form.total_amount) || 0
    const per = n > 0 ? (total / n).toFixed(2) : "0"
    const generated = Array.from({ length: n }, (_, i) => ({
      amount: i === n - 1 ? (total - parseFloat(per) * (n - 1)).toFixed(2) : per,
      due_date: addMonths(split.start_date, i),
    }))
    setRows(generated)
  }

  const handleCreate = async () => {
    setActionLoading("save")
    setSaveError("")
    try {
      const installments =
        paymentType === "full"
          ? [{ amount: form.total_amount, due_date: new Date().toISOString().slice(0, 10) }]
          : rows
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, installments }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSaveError(result.error || "Failed to save")
        setActionLoading(null)
        return
      }
      setDialogOpen(false)
      resetForm()
      fetchInvoices()
    } catch (e) {
      setSaveError("Network error - please try again")
      console.error("Failed to save invoice:", e)
    }
    setActionLoading(null)
  }

  const handleEditInvoice = (inv: Invoice) => {
    setEditing(inv)
    setForm({ client_email: inv.client_email, client_name: inv.client_name, title: inv.title, total_amount: String(inv.total_amount), currency: inv.currency, notes: inv.notes || "", send_email: false })
    setDialogOpen(true)
  }

  const handleUpdateInvoice = async () => {
    if (!editing) return
    setActionLoading("save")
    setSaveError("")
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, client_email: form.client_email, client_name: form.client_name, title: form.title, total_amount: form.total_amount, currency: form.currency, notes: form.notes }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSaveError(result.error || "Failed to update")
        setActionLoading(null)
        return
      }
      setDialogOpen(false)
      resetForm()
      fetchInvoices()
    } catch (e) {
      setSaveError("Network error - please try again")
      console.error("Failed to update invoice:", e)
    }
    setActionLoading(null)
  }

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice and all its installments?")) return
    setActionLoading(id)
    try {
      await fetch("/api/admin/invoices?id=" + id, { method: "DELETE" })
      fetchInvoices()
    } catch (e) { console.error("Failed to delete:", e) }
    setActionLoading(null)
  }

  const toggleExpand = (inv: Invoice) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(inv.id)) next.delete(inv.id)
      else {
        next.add(inv.id)
        const edits: Record<string, { amount: string; due_date: string }> = {}
        inv.invoice_installments.forEach((i) => { edits[i.id] = { amount: String(i.amount), due_date: i.due_date } })
        setRowEdits((prev2) => ({ ...prev2, ...edits }))
        setNewInstallment((prev2) => ({ ...prev2, [inv.id]: { amount: "", due_date: new Date().toISOString().slice(0, 10) } }))
      }
      return next
    })
  }

  const saveInstallment = async (installmentId: string) => {
    const edit = rowEdits[installmentId]
    if (!edit) return
    setActionLoading(installmentId)
    try {
      await fetch("/api/admin/invoices/installments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: installmentId, amount: edit.amount, due_date: edit.due_date }),
      })
      fetchInvoices()
    } catch (e) { console.error("Failed to save installment:", e) }
    setActionLoading(null)
  }

  const markPaid = async (installmentId: string) => {
    setActionLoading(installmentId)
    try {
      await fetch("/api/admin/invoices/installments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: installmentId, markPaid: true }),
      })
      fetchInvoices()
    } catch (e) { console.error("Failed to mark paid:", e) }
    setActionLoading(null)
  }

  const deleteInstallment = async (installmentId: string) => {
    if (!confirm("Delete this installment?")) return
    setActionLoading(installmentId)
    try {
      await fetch("/api/admin/invoices/installments?id=" + installmentId, { method: "DELETE" })
      fetchInvoices()
    } catch (e) { console.error("Failed to delete installment:", e) }
    setActionLoading(null)
  }

  const addInstallment = async (invoiceId: string) => {
    const draft = newInstallment[invoiceId]
    if (!draft?.amount || !draft?.due_date) return
    setActionLoading("new-" + invoiceId)
    try {
      await fetch("/api/admin/invoices/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, amount: draft.amount, due_date: draft.due_date }),
      })
      setNewInstallment((prev) => ({ ...prev, [invoiceId]: { amount: "", due_date: new Date().toISOString().slice(0, 10) } }))
      fetchInvoices()
    } catch (e) { console.error("Failed to add installment:", e) }
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Invoices</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvoices}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Add Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Invoice" : "Add Invoice"}</DialogTitle>
                <DialogDescription>
                  {editing ? "Update invoice details. Installments are edited from the invoice row." : "Create an invoice and split it across one or more installments."}
                </DialogDescription>
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
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 3-Month Mentorship Package" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Amount *</Label>
                    <Input type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>

                {!editing && (
                  <div className="space-y-3 rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">Payment</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={paymentType === "full" ? "default" : "outline"}
                        className="gap-1.5"
                        onClick={() => setPaymentType("full")}
                      >
                        <Wallet className="h-4 w-4" /> Full payment
                      </Button>
                      <Button
                        type="button"
                        variant={paymentType === "installments" ? "default" : "outline"}
                        className="gap-1.5"
                        onClick={() => setPaymentType("installments")}
                      >
                        <CalendarClock className="h-4 w-4" /> Installments
                      </Button>
                    </div>

                    {paymentType === "full" ? (
                      <p className="text-xs text-muted-foreground">
                        Creates a single invoice for the full amount, due today.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Split into N months</Label>
                            <Input type="number" min="1" value={split.count} onChange={(e) => setSplit({ ...split, count: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Starting</Label>
                            <Input type="date" value={split.start_date} onChange={(e) => setSplit({ ...split, start_date: e.target.value })} />
                          </div>
                          <Button type="button" variant="outline" onClick={applySplit}>Generate</Button>
                        </div>

                        <div className="space-y-2">
                          {rows.map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Input type="number" step="0.01" placeholder="Amount" value={r.amount} onChange={(e) => setRows(rows.map((row, idx) => idx === i ? { ...row, amount: e.target.value } : row))} />
                              <Input type="date" value={r.due_date} onChange={(e) => setRows(rows.map((row, idx) => idx === i ? { ...row, due_date: e.target.value } : row))} />
                              <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} disabled={rows.length === 1}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { amount: "", due_date: new Date().toISOString().slice(0, 10) }])}>
                            <Plus className="mr-1 h-3 w-3" /> Add installment row
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="send_email" className="cursor-pointer">Notify client by email</Label>
                  <input id="send_email" type="checkbox" className="h-4 w-4" checked={form.send_email} onChange={(e) => setForm({ ...form, send_email: e.target.checked })} />
                </div>

                {saveError && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">{saveError}</div>}
                <Button onClick={editing ? handleUpdateInvoice : handleCreate} disabled={actionLoading === "save" || !form.client_email || !form.title || !form.total_amount} className="w-full">
                  {actionLoading === "save" ? "Saving..." : editing ? "Update Invoice" : "Create Invoice"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...</div>
      ) : invoices.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">No invoices yet. Click &quot;Add Invoice&quot; to create one.</CardContent></Card>
      ) : (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <Fragment key={inv.id}>
                  <TableRow className="cursor-pointer" onClick={() => toggleExpand(inv)}>
                    <TableCell>{expanded.has(inv.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                    <TableCell><div className="font-medium">{inv.client_name || "-"}</div><div className="text-xs text-muted-foreground">{inv.client_email}</div></TableCell>
                    <TableCell>{inv.title}</TableCell>
                    <TableCell className="font-mono font-bold tabular-nums">{inv.currency} {inv.total_amount}</TableCell>
                    <TableCell><StatusPill status={inv.status} /></TableCell>
                    <TableCell className="font-mono text-sm">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEditInvoice(inv)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={actionLoading === inv.id} onClick={() => handleDeleteInvoice(inv.id)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded.has(inv.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="space-y-2 py-2">
                          <p className="text-xs font-medium text-muted-foreground">Installments</p>
                          {inv.invoice_installments.length === 0 && <p className="text-sm text-muted-foreground">No installments.</p>}
                          {inv.invoice_installments.map((i) => (
                            <div key={i.id} className="flex items-center gap-2">
                              <Input type="number" step="0.01" className="w-28" value={rowEdits[i.id]?.amount ?? String(i.amount)} onChange={(e) => setRowEdits({ ...rowEdits, [i.id]: { ...rowEdits[i.id], amount: e.target.value, due_date: rowEdits[i.id]?.due_date ?? i.due_date } })} />
                              <Input type="date" className="w-40" value={rowEdits[i.id]?.due_date ?? i.due_date} onChange={(e) => setRowEdits({ ...rowEdits, [i.id]: { ...rowEdits[i.id], due_date: e.target.value, amount: rowEdits[i.id]?.amount ?? String(i.amount) } })} />
                              <StatusPill status={i.status === "paid" ? "paid" : i.due_date < new Date().toISOString().slice(0, 10) ? "overdue" : "pending"} label={i.status} />
                              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === i.id} onClick={() => saveInstallment(i.id)}>Save</Button>
                              {i.status !== "paid" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" disabled={actionLoading === i.id} onClick={() => markPaid(i.id)}>
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Paid
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={actionLoading === i.id} onClick={() => deleteInstallment(i.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-1">
                            <Input type="number" step="0.01" placeholder="Amount" className="w-28" value={newInstallment[inv.id]?.amount ?? ""} onChange={(e) => setNewInstallment({ ...newInstallment, [inv.id]: { amount: e.target.value, due_date: newInstallment[inv.id]?.due_date ?? new Date().toISOString().slice(0, 10) } })} />
                            <Input type="date" className="w-40" value={newInstallment[inv.id]?.due_date ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setNewInstallment({ ...newInstallment, [inv.id]: { amount: newInstallment[inv.id]?.amount ?? "", due_date: e.target.value } })} />
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === "new-" + inv.id} onClick={() => addInstallment(inv.id)}><Plus className="mr-1 h-3 w-3" /> Add</Button>
                          </div>
                          {inv.notes && <p className="pt-1 text-xs text-muted-foreground">Notes: {inv.notes}</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
