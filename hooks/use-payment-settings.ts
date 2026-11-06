"use client"

import { useEffect, useState } from "react"
import { DEFAULT_MENTORSHIP_PRICE } from "@/lib/plan-pricing"
import { DEFAULT_USD_TO_EGP, DEFAULT_INSTAPAY_LINK } from "@/lib/egp"

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
  /** Where the modal's "transfer now" button sends the buyer. */
  instapayLink: string
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
  instapayLink: DEFAULT_INSTAPAY_LINK,
}

// Shared across every component on the page: the first mount fetches, the
// rest reuse the answer. Without this, a component mounted later (a modal, a
// second checkout section) starts from DEFAULTS again and visibly corrects
// itself once its own fetch lands.
let cached: PaymentSettings | null = null
let inflight: Promise<PaymentSettings> | null = null

/** Fetches the admin-controlled payment settings once per page session.
 *  Defaults to "everything open" so a slow/failed fetch never blocks a
 *  legitimate checkout — but anything derived from a live number (prices,
 *  the EGP rate) should wait for `loading` to clear before being shown,
 *  or it will render the placeholder value first. */
export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(cached ?? DEFAULTS)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    let cancelled = false
    inflight ??= fetch("/api/payment-settings")
      .then((r) => r.json())
      .then((d) => (cached = { ...DEFAULTS, ...d }))
      .catch((e) => { inflight = null; throw e })

    inflight
      .then((s) => { if (!cancelled) setSettings(s) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { settings, loading }
}
