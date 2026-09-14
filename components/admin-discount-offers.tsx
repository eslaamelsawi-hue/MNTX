"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import { Gift, Send, Loader2, RefreshCw, Bell, Trash2 } from "lucide-react"

type Offer = {
  id: string
  client_email: string
  coupon_code: string
  plan: string
  discount_percent: number
  expires_at: string
  sent_at: string
  status: "active" | "redeemed" | "expired"
}

export function AdminDiscountOffers() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState("")
  const [discountPercent, setDiscountPercent] = useState("40")
  const [expiryDays, setExpiryDays] = useState("3")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [rowActionId, setRowActionId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/discount-offer")
      const data = await res.json()
      setOffers(data.offers ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const send = async () => {
    setError("")
    setSuccess("")
    if (!email.trim().includes("@")) {
      setError("Enter a valid client email.")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/admin/discount-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_email: email.trim(), discount_percent: Number(discountPercent), expiry_days: Number(expiryDays) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to send offer.")
        return
      }
      setSuccess(`Sent! Code ${data.couponCode} emailed to ${email.trim()}.`)
      setEmail("")
      await load()
    } finally {
      setSending(false)
    }
  }

  const resend = async (offer: Offer) => {
    setError("")
    setSuccess("")
    setRowActionId(offer.id)
    try {
      const res = await fetch(`/api/admin/discount-offer/${offer.id}/resend`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to resend reminder.")
        return
      }
      setSuccess(`Reminder resent to ${offer.client_email}.`)
      await load()
    } finally {
      setRowActionId(null)
    }
  }

  const remove = async (offer: Offer) => {
    if (!confirm(`Delete this offer and revoke code ${offer.coupon_code} for ${offer.client_email}?`)) return
    setError("")
    setSuccess("")
    setRowActionId(offer.id)
    try {
      const res = await fetch(`/api/admin/discount-offer?id=${offer.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Failed to delete offer.")
        return
      }
      await load()
    } finally {
      setRowActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4 text-primary" /> Send a Discount Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Automatically generates a single-use coupon code and emails it to this client with a nicely designed offer. Currently
            scoped to the 1-on-1 Coaching Plan ($999) — the only plan the checkout page fully supports today.
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label className="text-xs">Client email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Discount %</Label>
              <Input type="number" min="1" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Expires in (days)</Label>
              <Input type="number" min="1" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="h-9" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <Button onClick={send} disabled={sending} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Offer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold text-foreground">Sent Offers</h3>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : offers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No discount offers sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm">{o.client_email}</TableCell>
                    <TableCell className="font-mono text-sm">{o.coupon_code}</TableCell>
                    <TableCell className="font-mono text-sm">{o.discount_percent}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(o.sent_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(o.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell><StatusPill status={o.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {o.status !== "redeemed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-amber-400 hover:text-amber-300"
                            disabled={rowActionId === o.id}
                            onClick={() => resend(o)}
                          >
                            {rowActionId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />} Resend
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          disabled={rowActionId === o.id}
                          onClick={() => remove(o)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
