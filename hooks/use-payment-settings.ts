"use client"

import { useEffect, useState } from "react"
import { DEFAULT_MENTORSHIP_PRICE } from "@/lib/plan-pricing"
import { DEFAULT_USD_TO_EGP, DEFAULT_INSTAPAY_NUMBER, DEFAULT_VODAFONE_NUMBER } from "@/lib/egp"

export type PaymentSettings = {
  subscriptionsOpen: boolean
  okx: boolean
  nowpayments: boolean
  stripe: boolean
  egypt: boolean
  whop: boolean
  /** Live coaching list price, so marketing copy matches checkout. */
  coachingPrice: number
  /** Effective USD → EGP (live market rate + margin, or a manual override). */
  usdToEgp: number
  usdToEgpLive: number | null
  usdToEgpMargin: number
  usdToEgpSource: "live" | "manual" | "last-known" | "default"
  instapayNumber: string
  vodafoneNumber: string
}

const DEFAULTS: PaymentSettings = {
  subscriptionsOpen: true,
  okx: true,
  nowpayments: true,
  stripe: true,
  egypt: true,
  whop: true,
  coachingPrice: DEFAULT_MENTORSHIP_PRICE,
  usdToEgp: DEFAULT_USD_TO_EGP,
  usdToEgpLive: null,
  usdToEgpMargin: 1,
  usdToEgpSource: "default",
  instapayNumber: DEFAULT_INSTAPAY_NUMBER,
  vodafoneNumber: DEFAULT_VODAFONE_NUMBER,
}

/** Fetches the admin-controlled payment kill-switches once per mount.
 *  Defaults to "everything open" so a slow/failed fetch never blocks a
 *  legitimate checkout — components should still re-check after loading
 *  finishes if they want to react to a closed method. */
export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/payment-settings")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSettings({ ...DEFAULTS, ...d }) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { settings, loading }
}
