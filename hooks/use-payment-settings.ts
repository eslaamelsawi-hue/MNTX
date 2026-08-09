"use client"

import { useEffect, useState } from "react"

export type PaymentSettings = {
  subscriptionsOpen: boolean
  okx: boolean
  nowpayments: boolean
  stripe: boolean
  egypt: boolean
}

const DEFAULTS: PaymentSettings = {
  subscriptionsOpen: true,
  okx: true,
  nowpayments: true,
  stripe: true,
  egypt: true,
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
