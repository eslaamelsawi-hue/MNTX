"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { RefreshCw, ShieldAlert, CreditCard } from "lucide-react"

type Flags = {
  subscriptions_open: boolean
  payment_okx_enabled: boolean
  payment_nowpayments_enabled: boolean
  payment_stripe_enabled: boolean
  payment_egypt_enabled: boolean
}

const DEFAULTS: Flags = {
  subscriptions_open: true,
  payment_okx_enabled: true,
  payment_nowpayments_enabled: true,
  payment_stripe_enabled: true,
  payment_egypt_enabled: true,
}

const METHODS: { key: keyof Flags; label: string; desc: string }[] = [
  { key: "payment_okx_enabled", label: "OKX (Crypto)", desc: "The \"Pay with OKX\" button across checkout pages." },
  { key: "payment_nowpayments_enabled", label: "NOWPayments (Crypto)", desc: "The \"Pay with Crypto\" button across checkout pages." },
  { key: "payment_stripe_enabled", label: "Card (Stripe)", desc: "Embedded card checkout at /checkout/[plan] and unified checkout." },
  { key: "payment_egypt_enabled", label: "Egypt (Instapay / Vodafone Cash)", desc: "The manual Egyptian payment instructions page." },
]

export function AdminPaymentSettings() {
  const [flags, setFlags] = useState<Flags>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

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
      })
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
    </div>
  )
}
