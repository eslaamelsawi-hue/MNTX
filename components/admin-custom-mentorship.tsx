"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusPill } from "@/components/status-pill"

type Request = {
  id: string
  full_name: string
  email: string
  telegram_username: string | null
  sessions: number
  focus_areas: string[] | null
  level: string | null
  goals: string | null
  quoted_price: number
  status: "new" | "approved" | "rejected"
  final_price: number | null
  coupon_code: string | null
  checkout_url: string | null
  split_first_amount: number | null
  split_second_amount: number | null
  payment_methods: string[] | null
  decline_reason: string | null
  created_at: string
}

const METHODS: { id: string; label: string }[] = [
  { id: "visa", label: "Visa / Card" },
  { id: "okx", label: "Crypto (OKX)" },
  { id: "instapay", label: "Instapay" },
]

export function AdminCustomMentorship() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [target, setTarget] = useState<Request | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Approval form
  const [finalPrice, setFinalPrice] = useState("")
  const [useSplit, setUseSplit] = useState(false)
  const [firstAmount, setFirstAmount] = useState("")
  const [secondAmount, setSecondAmount] = useState("")
  const [methods, setMethods] = useState<string[]>(["visa", "okx", "instapay"])
  const [formError, setFormError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/custom-mentorship")
      const data = await res.json()
      setRequests(data.requests ?? [])
    } catch (e) {
      console.error("Failed to load custom mentorship requests:", e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openApprove = (r: Request) => {
    setTarget(r)
    setFinalPrice(String(r.quoted_price))
    setUseSplit(false)
    // A sensible starting point the admin can overwrite: 60% now, 40% later.
    setFirstAmount(String(Math.round(r.quoted_price * 0.6)))
    setSecondAmount(String(r.quoted_price - Math.round(r.quoted_price * 0.6)))
    setMethods(["visa", "okx", "instapay"])
    setFormError("")
  }

  const price = Number(finalPrice)
  const splitTotal = Number(firstAmount) + Number(secondAmount)

  const approve = async () => {
    if (!target) return
    setFormError("")
    if (!Number.isFinite(price) || price <= 0 || price > target.quoted_price) {
      setFormError(`Price must be between $1 and the quoted $${target.quoted_price}.`)
      return
    }
    if (methods.length === 0) {
      setFormError("Choose at least one payment method.")
      return
    }
    if (useSplit && Math.abs(splitTotal - price) > 0.01) {
      setFormError(`The two payments must add up to $${price}.`)
      return
    }

    setBusy(target.id)
    try {
      const res = await fetch(`/api/custom-mentorship/${target.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPrice: price,
          paymentMethods: methods,
          ...(useSplit ? { split: { firstAmount: Number(firstAmount), secondAmount: Number(secondAmount) } } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormError(data.error || "Failed to approve."); return }
      setTarget(null)
      await load()
    } finally {
      setBusy(null)
    }
  }

  const decline = async (r: Request) => {
    const reason = prompt("Why are you declining? (sent to the client)")
    if (reason === null) return
    setBusy(r.id)
    try {
      await fetch(`/api/custom-mentorship/${r.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === "new").length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Custom Mentorship Requests</CardTitle>
            <CardDescription>
              Plans built on /customize-mentorship. Nothing is charged until you approve — approving sets
              the price, the split and which payment methods the client gets, then emails them a link.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {pending > 0 && (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
              {pending} request{pending === 1 ? "" : "s"} waiting for review
            </p>
          )}
          {requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.full_name}</span>
                        <StatusPill status={r.status} />
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {r.sessions} session{r.sessions === 1 ? "" : "s"}
                        </span>
                        <span className="font-mono text-sm tabular-nums text-yellow-400">${r.quoted_price}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span dir="ltr">{r.email}</span>
                        {r.telegram_username && <span dir="ltr"> · @{r.telegram_username}</span>}
                        {r.level && <span> · {r.level}</span>}
                      </p>
                      {r.focus_areas && r.focus_areas.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">{r.focus_areas.join(" · ")}</p>
                      )}
                      {r.goals && <p className="mt-2 text-xs italic text-muted-foreground">“{r.goals}”</p>}

                      {r.status === "approved" && (
                        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                          <p className="text-emerald-400">
                            Approved at ${r.final_price}
                            {r.split_first_amount
                              ? ` — $${r.split_first_amount} now + $${r.split_second_amount} later`
                              : " — paid in full"}
                            {r.payment_methods?.length ? ` · ${r.payment_methods.join(", ")}` : ""}
                          </p>
                          {r.checkout_url && (
                            <button
                              onClick={() => copy(r.checkout_url!, r.id)}
                              className="mt-1.5 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" />
                              {copied === r.id ? "Copied" : "Copy checkout link"}
                            </button>
                          )}
                        </div>
                      )}
                      {r.status === "rejected" && r.decline_reason && (
                        <p className="mt-3 text-xs text-red-400">Declined: {r.decline_reason}</p>
                      )}
                    </div>

                    {r.status === "new" && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={busy === r.id}
                          onClick={() => openApprove(r)}
                        >
                          <Check className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                          disabled={busy === r.id}
                          onClick={() => decline(r)}
                        >
                          <X className="mr-1 h-3 w-3" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {target && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setTarget(null)}
        >
          <div
            className="my-auto w-full max-w-md rounded-2xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Approve — {target.full_name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {target.sessions} session{target.sessions === 1 ? "" : "s"}, quoted ${target.quoted_price}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs">Final price (USD)</Label>
                <Input
                  type="number"
                  min="1"
                  max={target.quoted_price}
                  value={finalPrice}
                  onChange={(e) => { setFinalPrice(e.target.value); setFormError("") }}
                  className="h-10"
                />
                {Number.isFinite(price) && price < target.quoted_price && (
                  <p className="mt-1 text-xs text-emerald-400">
                    ${target.quoted_price - price} off ({Math.round(((target.quoted_price - price) / target.quoted_price) * 100)}%)
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Payment</Label>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setUseSplit(false); setFormError("") }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${!useSplit ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    Full amount
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUseSplit(true); setFormError("") }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${useSplit ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    Split into 2
                  </button>
                </div>
              </div>

              {useSplit && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First payment</Label>
                    <Input
                      type="number"
                      min="1"
                      value={firstAmount}
                      onChange={(e) => { setFirstAmount(e.target.value); setFormError("") }}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Second payment</Label>
                    <Input
                      type="number"
                      min="1"
                      value={secondAmount}
                      onChange={(e) => { setSecondAmount(e.target.value); setFormError("") }}
                      className="h-10"
                    />
                  </div>
                  <p className={`col-span-2 text-xs ${Math.abs(splitTotal - price) > 0.01 ? "text-destructive" : "text-muted-foreground"}`}>
                    {`Total: $${splitTotal || 0} — must equal $${price || 0}`}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs">Payment methods the client can use</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {METHODS.map((m) => {
                    const on = methods.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMethods((cur) => (on ? cur.filter((x) => x !== m.id) : [...cur, m.id]))
                          setFormError("")
                        }}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {on && <Check className="mr-1 inline h-3 w-3" />}
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}

            <div className="mt-6 flex gap-2">
              <Button className="flex-1" disabled={busy === target.id} onClick={approve}>
                {busy === target.id ? "Approving…" : "Approve & email the link"}
              </Button>
              <Button variant="outline" onClick={() => setTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
