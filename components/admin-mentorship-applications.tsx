"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import { Loader2, RefreshCw, Gift, CheckCircle2, XCircle, Eye } from "lucide-react"

type Application = {
  id: string
  full_name: string
  email: string
  whatsapp: string
  age: number | null
  telegram_username: string
  instagram: string | null
  country: string
  current_job: string | null
  hours_per_day: string | null
  taught_by: string | null
  market_experience: string | null
  learning_duration: string | null
  tried_funded_account: boolean | null
  passed_funded_account: boolean | null
  past_losses: string | null
  why_join: string | null
  top_mistakes: string | null
  loss_reason_opinion: string | null
  three_losses_reaction: string | null
  can_attend_live: boolean | null
  can_dedicate_weekly_time: boolean | null
  commitment_rating: number | null
  what_differentiates: string | null
  paid_courses_before: string | null
  investment_range: string | null
  investment_reason: string | null
  status: "new" | "reviewed" | "approved" | "rejected"
  admin_notes: string | null
  created_at: string
}

const yn = (v: boolean | null) => (v === true ? "Yes" : v === false ? "No" : "—")

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="border-b border-border/60 py-2 last:border-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  )
}

export function AdminMentorshipApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Application | null>(null)
  const [notes, setNotes] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/mentorship-applications")
      const data = await res.json()
      setApplications(data.applications ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openDetail = (app: Application) => {
    setSelected(app)
    setNotes(app.admin_notes ?? "")
    setError("")
    setSuccess("")
  }

  const updateStatus = async (id: string, status: Application["status"]) => {
    setActionLoading(id + status)
    setError("")
    try {
      const res = await fetch("/api/mentorship-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to update status.")
        return
      }
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
    } finally {
      setActionLoading(null)
    }
  }

  const saveNotes = async (id: string) => {
    setActionLoading(id + "notes")
    setError("")
    try {
      const res = await fetch("/api/mentorship-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, admin_notes: notes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to save notes.")
        return
      }
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, admin_notes: notes } : a)))
      setSuccess("Notes saved.")
    } finally {
      setActionLoading(null)
    }
  }

  const approveAndSendOffer = async (app: Application) => {
    setActionLoading(app.id + "offer")
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/admin/discount-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_email: app.email, discount_percent: 40, expiry_days: 7 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to send the 40% offer.")
        return
      }
      await updateStatus(app.id, "approved")
      setSuccess(`Approved! Code ${data.couponCode} emailed to ${app.email}.`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h3 className="font-semibold text-foreground">Mentorship Applications</h3>
              <p className="text-xs text-muted-foreground">Submitted through the /apply 1-on-1 Coaching funnel.</p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : applications.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{a.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.country}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.investment_range || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><StatusPill status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => openDetail(a)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {a.status !== "approved" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-emerald-400 hover:text-emerald-300"
                            disabled={actionLoading === a.id + "offer"}
                            onClick={() => approveAndSendOffer(a)}
                          >
                            {actionLoading === a.id + "offer" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />} Approve
                          </Button>
                        )}
                        {a.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-red-400 hover:text-red-300"
                            disabled={actionLoading === a.id + "rejected"}
                            onClick={() => updateStatus(a.id, "rejected")}
                          >
                            {actionLoading === a.id + "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Reject
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.full_name}
                  <StatusPill status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-400">{success}</p>}

              <div className="space-y-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Personal</p>
                <Field label="Email" value={selected.email} />
                <Field label="WhatsApp" value={selected.whatsapp} />
                <Field label="Age" value={selected.age} />
                <Field label="Telegram" value={selected.telegram_username} />
                <Field label="Instagram" value={selected.instagram} />
                <Field label="Country" value={selected.country} />
              </div>

              <div className="space-y-1 pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Trading experience</p>
                <Field label="Current job" value={selected.current_job} />
                <Field label="Hours/day for trading" value={selected.hours_per_day} />
                <Field label="Taught by" value={selected.taught_by} />
                <Field label="Market experience" value={selected.market_experience} />
                <Field label="Learning duration" value={selected.learning_duration} />
                <Field label="Tried funded account" value={yn(selected.tried_funded_account)} />
                <Field label="Passed funded account" value={yn(selected.passed_funded_account)} />
                <Field label="Past losses" value={selected.past_losses} />
              </div>

              <div className="space-y-1 pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Mindset & commitment</p>
                <Field label="Why join" value={selected.why_join} />
                <Field label="Top mistakes" value={selected.top_mistakes} />
                <Field label="Loss reason (opinion)" value={selected.loss_reason_opinion} />
                <Field label="3 losses in a row — reaction" value={selected.three_losses_reaction} />
                <Field label="Can attend live sessions" value={yn(selected.can_attend_live)} />
                <Field label="Can dedicate weekly time" value={yn(selected.can_dedicate_weekly_time)} />
                <Field label="Commitment (1-10)" value={selected.commitment_rating} />
                <Field label="What differentiates them" value={selected.what_differentiates} />
                <Field label="Paid courses before" value={selected.paid_courses_before} />
              </div>

              <div className="space-y-1 pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Investment</p>
                <Field label="Range" value={selected.investment_range} />
                <Field label="Why this number" value={selected.investment_reason} />
              </div>

              <div className="space-y-2 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Admin notes</p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Private notes about this applicant…" />
                <Button variant="outline" size="sm" disabled={actionLoading === selected.id + "notes"} onClick={() => saveNotes(selected.id)}>
                  {actionLoading === selected.id + "notes" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save notes"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                {selected.status !== "approved" && (
                  <Button
                    className="gap-1.5"
                    disabled={actionLoading === selected.id + "offer"}
                    onClick={() => approveAndSendOffer(selected)}
                  >
                    {actionLoading === selected.id + "offer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Approve & Send 40% Offer
                  </Button>
                )}
                {selected.status === "new" && (
                  <Button variant="outline" className="gap-1.5" disabled={actionLoading === selected.id + "reviewed"} onClick={() => updateStatus(selected.id, "reviewed")}>
                    {actionLoading === selected.id + "reviewed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark Reviewed
                  </Button>
                )}
                {selected.status !== "rejected" && (
                  <Button
                    variant="outline"
                    className="gap-1.5 text-red-400 hover:text-red-300"
                    disabled={actionLoading === selected.id + "rejected"}
                    onClick={() => updateStatus(selected.id, "rejected")}
                  >
                    {actionLoading === selected.id + "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
