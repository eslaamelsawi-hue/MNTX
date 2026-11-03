"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, ShieldAlert, CreditCard, Banknote } from "lucide-react"
import { DEFAULT_USD_TO_EGP, usdToEgp, formatEgp } from "@/lib/egp"

type Flags = {
  subscriptions_open: boolean
  payment_okx_enabled: boolean
  payment_nowpayments_enabled: boolean
  payment_stripe_enabled: boolean
  payment_egypt_enabled: boolean
  payment_whop_enabled: boolean
}

const DEFAULTS: Flags = {
  subscriptions_open: true,
  payment_okx_enabled: true,
  payment_nowpayments_enabled: true,
  payment_stripe_enabled: true,
  payment_egypt_enabled: true,
  payment_whop_enabled: true,
}

const METHODS: { key: keyof Flags; label: string; desc: string }[] = [
  { key: "payment_okx_enabled", label: "OKX (Crypto)", desc: "The \"Pay with OKX\" button across checkout pages." },
  { key: "payment_nowpayments_enabled", label: "NOWPayments (Crypto)", desc: "The \"Pay with Crypto\" button across checkout pages." },
  { key: "payment_stripe_enabled", label: "Card (Stripe)", desc: "Embedded card checkout at /checkout/[plan] and unified checkout." },
  { key: "payment_egypt_enabled", label: "Egypt (Instapay / Vodafone Cash)", desc: "The manual Egyptian payment instructions page." },
  { key: "payment_whop_enabled", label: "Visa / Card (Whop)", desc: "The \"Pay with Visa\" button across checkout pages." },
]

export function AdminPaymentSettings() {
  const [flags, setFlags] = useState<Flags>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [egpRate, setEgpRate] = useState(String(DEFAULT_USD_TO_EGP))
  const [egpSaving, setEgpSaving] = useState(false)
  const [egpMsg, setEgpMsg] = useState("")
  const [egpError, setEgpError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      const data = await res.json()
      const settings: Record<string, string> = data.settings || {}
      setFlags({
        subscriptions_open: settings.subscriptions_open !== "false",
        payment_okx_enabled: settings.payment_okx_enabled !== "false",
        payment_nowpayments_enabled: settings.payment_nowpayments_enabled !== "false",
        payment_stripe_enabled: settings.payment_stripe_enabled !== "false",
        payment_egypt_enabled: settings.payment_egypt_enabled !== "false",
        payment_whop_enabled: settings.payment_whop_enabled !== "false",
      })
      if (settings.usd_to_egp_rate) setEgpRate(settings.usd_to_egp_rate)
    } catch (e) {
      console.error("Failed to load payment settings:", e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (key: keyof Flags, next: boolean) => {
    setFlags((f) => ({ ...f, [key]: next }))
    setSavingKey(key)
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: next ? "true" : "false" }),
      })
    } catch (e) {
      console.error("Failed to save setting:", e)
      setFlags((f) => ({ ...f, [key]: !next })) // revert on failure
    }
    setSavingKey(null)
  }

  const saveEgpRate = async () => {
    const value = Number(egpRate)
    setEgpError("")
    setEgpMsg("")
    if (!Number.isFinite(value) || value <= 0) { setEgpError("Rate must be greater than 0."); return }
    setEgpSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "usd_to_egp_rate", value: String(value) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setEgpError(data.error || "Failed to save.")
        return
      }
      setEgpMsg("Saved.")
    } finally {
      setEgpSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className={!flags.subscriptions_open ? "border-red-500/40" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            New Subscriptions
          </CardTitle>
          <CardDescription>
            The master switch. Turning this off blocks checkout entirely, site-wide — no one can start a new
            subscription through any payment method until you turn it back on. Existing clients and admin actions
            (bookings, manual subscriptions in the admin dashboard) are unaffected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-between rounded-lg border p-4 ${!flags.subscriptions_open ? "border-red-500/30 bg-red-500/10" : "border-border"}`}>
            <div>
              <p className="text-sm font-medium text-foreground">Accepting new subscriptions</p>
              <p className="text-xs text-muted-foreground">
                {flags.subscriptions_open
                  ? "The website is open for new checkouts."
                  : "Checkout is closed — visitors see a \"not accepting new subscriptions\" message."}
              </p>
            </div>
            <Switch
              checked={flags.subscriptions_open}
              disabled={savingKey === "subscriptions_open"}
              onCheckedChange={(checked) => toggle("subscriptions_open", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Turn individual payment methods on or off. A disabled method disappears from checkout everywhere it's
            offered, regardless of the master switch above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {METHODS.map((m) => (
            <div key={m.key} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
              <Switch
                checked={flags[m.key]}
                disabled={savingKey === m.key}
                onCheckedChange={(checked) => toggle(m.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Egyptian Payment Rate
          </CardTitle>
          <CardDescription>
            USD → EGP used on the Instapay / Vodafone Cash instructions. Every plan&apos;s Egyptian
            amount is converted from this, so there are no per-plan figures to keep in sync — set
            it once and include whatever margin you want. Amounts are rounded up to the nearest 50 EGP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">1 USD =</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={egpRate}
                onChange={(e) => { setEgpRate(e.target.value); setEgpMsg("") }}
                className="h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Preview</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                {Number(egpRate) > 0
                  ? `$100 → ${formatEgp(usdToEgp(100, Number(egpRate)))} EGP · $1200 → ${formatEgp(usdToEgp(1200, Number(egpRate)))} EGP`
                  : "—"}
              </div>
            </div>
          </div>
          {egpError && <p className="text-sm text-destructive">{egpError}</p>}
          {egpMsg && <p className="text-sm text-emerald-400">{egpMsg}</p>}
          <Button size="sm" onClick={saveEgpRate} disabled={egpSaving}>
            {egpSaving ? "Saving…" : "Save Rate"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
