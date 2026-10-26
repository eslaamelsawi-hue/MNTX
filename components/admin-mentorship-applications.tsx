"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, CheckCircle2, XCircle, Eye, Link as LinkIcon, Tag } from "lucide-react"

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
  coupon_code: string | null
  checkout_url: string | null
  decline_reason: string | null
  granted_discount_percent: number | null
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
  const [approveTarget, setApproveTarget] = useState<Application | null>(null)
  const [useCustomDiscount, setUseCustomDiscount] = useState(false)
  const [customDiscount, setCustomDiscount] = useState("")
  const [approveError, setApproveError] = useState("")
  const [useSplit, setUseSplit] = useState(false)
  const [firstPayment, setFirstPayment] = useState("")
  const [secondPayment, setSecondPayment] = useState("")

  const [declineTarget, setDeclineTarget] = useState<Application | null>(null)
  const [declineReason, setDeclineReason] = useState("")
  const [declineError, setDeclineError] = useState("")

  // Mentorship price + approved-applicant discount, editable here.
  const [priceInput, setPriceInput] = useState("")
  const [discountInput, setDiscountInput] = useState("")
  const [savedPricing, setSavedPricing] = useState<{ price: number; discount: number } | null>(null)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingMsg, setPricingMsg] = useState("")
  const [pricingError, setPricingError] = useState("")

  const loadPricing = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      const settings: Record<string, string> = data.settings || {}
      const price = Number(settings.mentorship_price) || 1200
      const discount = settings.mentorship_discount_percent !== undefined ? Number(settings.mentorship_discount_percent) : 50
      setSavedPricing({ price, discount })
      setPriceInput(String(price))
      setDiscountInput(String(discount))
    } catch {
      /* non-fatal — the fields just stay blank */
    }
  }

  const savePricing = async () => {
    const price = Number(priceInput)
    const discount = Number(discountInput)
    setPricingError("")
    setPricingMsg("")
    if (!Number.isFinite(price) || price <= 0) { setPricingError("Price must be greater than 0."); return }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) { setPricingError("Discount must be between 0 and 100."); return }

    setPricingSaving(true)
    try {
      for (const [key, value] of [["mentorship_price", price], ["mentorship_discount_percent", discount]] as const) {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: String(value) }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setPricingError(data.error || "Failed to save.")
          return
        }
      }
      setSavedPricing({ price, discount })
      setPricingMsg("Saved.")
    } finally {
      setPricingSaving(false)
    }
  }

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
  useEffect(() => { load(); loadPricing() }, [])

  const openDetail = (app: Application) => {
    setSelected(app)
    setNotes(app.admin_notes ?? "")
    setError("")
    setSuccess("")
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch("/api/mentorship-applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    })
    return { res, data: await res.json().catch(() => ({})) }
  }

  const saveNotes = async (id: string) => {
    setActionLoading(id + "notes")
    setError("")
    try {
      const { res, data } = await patch(id, { admin_notes: notes })
      if (!res.ok) { setError(data.error || "Failed to save notes."); return }
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, admin_notes: notes } : a)))
      setSuccess("Notes saved.")
    } finally {
      setActionLoading(null)
    }
  }

  const markReviewed = async (id: string) => {
    setActionLoading(id + "reviewed")
    setError("")
    try {
      const { res, data } = await patch(id, { status: "reviewed" })
      if (!res.ok) { setError(data.error || "Failed to update status."); return }
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: "reviewed" } : a)))
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status: "reviewed" } : prev))
    } finally {
      setActionLoading(null)
    }
  }

  const openApproveDialog = (app: Application) => {
    setApproveTarget(app)
    setUseCustomDiscount(false)
    setCustomDiscount(savedPricing ? String(savedPricing.discount) : "")
    setUseSplit(false)
    setFirstPayment("")
    setSecondPayment("")
    setApproveError("")
  }

  const approve = async (
    app: Application,
    discountPercent?: number,
    split?: { firstAmount: number; secondAmount: number }
  ) => {
    setActionLoading(app.id + "approve")
    setError("")
    setSuccess("")
    setApproveError("")
    try {
      const res = await fetch(`/api/mentorship-applications/${app.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(discountPercent !== undefined ? { discountPercent } : {}),
          ...(split ? { split } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setApproveError(data.error || "Failed to approve and send the checkout link."); return }
      const updated = {
        status: "approved" as const,
        coupon_code: data.couponCode,
        checkout_url: data.checkoutUrl,
        granted_discount_percent: data.discountPercent ?? null,
      }
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, ...updated } : a)))
      setSelected((prev) => (prev && prev.id === app.id ? { ...prev, ...updated } : prev))
      setSuccess(
        data.split
          ? `Approved at ${data.discountPercent}% — $${data.split.firstAmount} now + $${data.split.secondAmount} later, link emailed to ${app.email}.`
          : `Approved at ${data.discountPercent}% — $${data.discountedPrice} checkout link emailed to ${app.email}.`
      )
      setApproveTarget(null)
    } finally {
      setActionLoading(null)
    }
  }

  const confirmApprove = () => {
    if (!approveTarget) return

    let percent: number | undefined
    if (useCustomDiscount) {
      const value = Number(customDiscount)
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        setApproveError("Discount must be between 0 and 100.")
        return
      }
      percent = value
    }

    if (!useSplit) { approve(approveTarget, percent); return }

    const first = Number(firstPayment)
    const second = Number(secondPayment)
    if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0 || second <= 0) {
      setApproveError("Both payments must be greater than 0.")
      return
    }
    if (approveFinalPrice !== null && Math.abs(first + second - approveFinalPrice) > 0.01) {
      setApproveError(`The two payments must add up to $${approveFinalPrice}.`)
      return
    }
    approve(approveTarget, percent, { firstAmount: first, secondAmount: second })
  }

  const openDeclineDialog = (app: Application) => {
    setDeclineTarget(app)
    setDeclineReason("")
    setDeclineError("")
  }

  const confirmDecline = async () => {
    if (!declineTarget) return
    if (!declineReason.trim()) { setDeclineError("Enter a reason to send to the applicant."); return }
    setActionLoading(declineTarget.id + "decline")
    setDeclineError("")
    try {
      const res = await fetch(`/api/mentorship-applications/${declineTarget.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setDeclineError(data.error || "Failed to send the decline email."); return }
      const updated = { status: "rejected" as const, decline_reason: declineReason.trim() }
      setApplications((prev) => prev.map((a) => (a.id === declineTarget.id ? { ...a, ...updated } : a)))
      setSelected((prev) => (prev && prev.id === declineTarget.id ? { ...prev, ...updated } : prev))
      setDeclineTarget(null)
    } finally {
      setActionLoading(null)
    }
  }

  const savedFinalPrice = savedPricing
    ? Math.round(savedPricing.price * (1 - savedPricing.discount / 100))
    : null

  const approveFinalPrice = (() => {
    if (!savedPricing) return null
    const percent = useCustomDiscount ? Number(customDiscount) : savedPricing.discount
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null
    return Math.round(savedPricing.price * (1 - percent / 100))
  })()

  const customFinalPrice =
    savedPricing && customDiscount !== "" && Number.isFinite(Number(customDiscount)) &&
    Number(customDiscount) >= 0 && Number(customDiscount) <= 100
      ? Math.round(savedPricing.price * (1 - Number(customDiscount) / 100))
      : null

  const previewPrice = Number(priceInput)
  const previewDiscount = Number(discountInput)
  const previewFinal =
    Number.isFinite(previewPrice) && Number.isFinite(previewDiscount) && previewPrice > 0
      ? Math.round(previewPrice * (1 - previewDiscount / 100))
      : null

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Tag className="h-4 w-4 text-primary" /> Mentorship Pricing
            </h3>
            <p className="text-xs text-muted-foreground">
              The 1-on-1 Coaching list price and the discount an approved applicant gets. Changes apply
              immediately — to new approvals and to the list price everywhere the plan is sold.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Price (USD)</Label>
              <Input type="number" min="1" value={priceInput} onChange={(e) => { setPriceInput(e.target.value); setPricingMsg("") }} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Discount %</Label>
              <Input type="number" min="0" max="100" value={discountInput} onChange={(e) => { setDiscountInput(e.target.value); setPricingMsg("") }} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Applicant pays</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm font-bold text-primary">
                {previewFinal !== null ? `$${previewFinal}` : "—"}
              </div>
            </div>
          </div>
          {pricingError && <p className="text-sm text-destructive">{pricingError}</p>}
          {pricingMsg && <p className="text-sm text-emerald-400">{pricingMsg}</p>}
          <Button size="sm" onClick={savePricing} disabled={pricingSaving} className="gap-1.5">
            {pricingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Pricing
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h3 className="font-semibold text-foreground">Mentorship Applications</h3>
              <p className="text-xs text-muted-foreground">Submitted through the /apply 1-on-1 Coaching funnel. Approving emails a one-time full-payment checkout link.</p>
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
                            disabled={actionLoading === a.id + "approve"}
                            onClick={() => openApproveDialog(a)}
                          >
                            {actionLoading === a.id + "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                          </Button>
                        )}
                        {a.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-red-400 hover:text-red-300"
                            disabled={actionLoading === a.id + "decline"}
                            onClick={() => openDeclineDialog(a)}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Decline
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

      {/* Detail dialog */}
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

              {(selected.checkout_url || selected.decline_reason) && (
                <div className="space-y-1 pt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Decision</p>
                  {selected.checkout_url && (
                    <div className="border-b border-border/60 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Checkout link sent</p>
                      <a href={selected.checkout_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1.5 break-all text-sm text-primary hover:underline">
                        <LinkIcon className="h-3.5 w-3.5 shrink-0" /> {selected.checkout_url}
                      </a>
                    </div>
                  )}
                  <Field label="Discount granted" value={selected.granted_discount_percent !== null ? `${selected.granted_discount_percent}%` : null} />
                  <Field label="Decline reason sent" value={selected.decline_reason} />
                </div>
              )}

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
                    disabled={actionLoading === selected.id + "approve"}
                    onClick={() => openApproveDialog(selected)}
                  >
                    {actionLoading === selected.id + "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve &amp; Send{savedFinalPrice !== null ? ` $${savedFinalPrice}` : ""} Checkout
                  </Button>
                )}
                {selected.status === "new" && (
                  <Button variant="outline" className="gap-1.5" disabled={actionLoading === selected.id + "reviewed"} onClick={() => markReviewed(selected.id)}>
                    {actionLoading === selected.id + "reviewed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark Reviewed
                  </Button>
                )}
                {selected.status !== "rejected" && (
                  <Button
                    variant="outline"
                    className="gap-1.5 text-red-400 hover:text-red-300"
                    onClick={() => openDeclineDialog(selected)}
                  >
                    <XCircle className="h-4 w-4" /> Decline
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve dialog — default rate, or a one-off for this applicant */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="max-w-md">
          {approveTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Approve {approveTarget.full_name}</DialogTitle>
                <DialogDescription>
                  Pick the discount to send with their checkout link. The link is single-use and expires in 14 days.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => { setUseCustomDiscount(false); setApproveError("") }}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-start transition-colors ${
                    !useCustomDiscount ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${!useCustomDiscount ? "border-primary bg-primary" : "border-muted-foreground/60"}`} />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Current discount</span>
                    <span className="block text-xs text-muted-foreground">
                      {savedPricing
                        ? `${savedPricing.discount}% off $${savedPricing.price} — they pay $${savedFinalPrice}`
                        : "The rate configured above"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setUseCustomDiscount(true); setApproveError("") }}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-start transition-colors ${
                    useCustomDiscount ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${useCustomDiscount ? "border-primary bg-primary" : "border-muted-foreground/60"}`} />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Custom discount</span>
                    <span className="block text-xs text-muted-foreground">A one-off rate, just for this applicant</span>
                  </span>
                </button>

                {useCustomDiscount && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <div>
                      <Label className="text-xs">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        autoFocus
                        value={customDiscount}
                        onChange={(e) => { setCustomDiscount(e.target.value); setApproveError("") }}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">They pay</Label>
                      <div className="flex h-9 items-center rounded-md border border-border bg-background px-3 font-mono text-sm font-bold text-primary">
                        {customFinalPrice !== null ? `$${customFinalPrice}` : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment plan</p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setUseSplit(false); setApproveError("") }}
                    className={`rounded-xl border p-3 text-center text-sm font-semibold transition-colors ${
                      !useSplit ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    Full amount
                    {approveFinalPrice !== null && (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">${approveFinalPrice} at once</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseSplit(true)
                      setApproveError("")
                      // Seed a 50/50 starting point they can edit.
                      if (!firstPayment && !secondPayment && approveFinalPrice !== null) {
                        const half = Math.round(approveFinalPrice / 2)
                        setFirstPayment(String(half))
                        setSecondPayment(String(approveFinalPrice - half))
                      }
                    }}
                    className={`rounded-xl border p-3 text-center text-sm font-semibold transition-colors ${
                      useSplit ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    Split into 2
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Second due in 30 days</span>
                  </button>
                </div>

                {useSplit && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">First payment</Label>
                        <Input
                          type="number"
                          min="1"
                          value={firstPayment}
                          onChange={(e) => {
                            setFirstPayment(e.target.value)
                            setApproveError("")
                            // Keep the pair adding up to the total.
                            const first = Number(e.target.value)
                            if (approveFinalPrice !== null && Number.isFinite(first) && first > 0 && first < approveFinalPrice) {
                              setSecondPayment(String(Math.round((approveFinalPrice - first) * 100) / 100))
                            }
                          }}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Second payment</Label>
                        <Input
                          type="number"
                          min="1"
                          value={secondPayment}
                          onChange={(e) => { setSecondPayment(e.target.value); setApproveError("") }}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must add up to{" "}
                      <span className="font-mono font-bold text-foreground">
                        {approveFinalPrice !== null ? `$${approveFinalPrice}` : "the discounted total"}
                      </span>
                      {firstPayment && secondPayment && (
                        <>
                          {" "}— currently{" "}
                          <span className="font-mono font-bold text-foreground">
                            ${Math.round((Number(firstPayment) + Number(secondPayment)) * 100) / 100}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {approveError && <p className="text-sm text-destructive">{approveError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
                <Button
                  className="gap-1.5"
                  disabled={actionLoading === approveTarget.id + "approve"}
                  onClick={confirmApprove}
                >
                  {actionLoading === approveTarget.id + "approve"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4" />} Approve &amp; Send Link
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline reason dialog */}
      <Dialog open={!!declineTarget} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent className="max-w-md">
          {declineTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Decline {declineTarget.full_name}'s application</DialogTitle>
                <DialogDescription>This reason is emailed directly to the applicant — keep it clear and respectful.</DialogDescription>
              </DialogHeader>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                placeholder="e.g. We're looking for applicants with more hands-on trading experience right now…"
                autoFocus
              />
              {declineError && <p className="text-sm text-destructive">{declineError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeclineTarget(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={actionLoading === declineTarget.id + "decline"}
                  onClick={confirmDecline}
                >
                  {actionLoading === declineTarget.id + "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Decline Email"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
