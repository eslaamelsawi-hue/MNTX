import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  DEFAULT_USD_TO_EGP,
  DEFAULT_MARGIN,
  USD_TO_EGP_KEY,
  USD_TO_EGP_MARGIN_KEY,
  USD_TO_EGP_LIVE_KEY,
} from "@/lib/egp"

/** Free, no-key USD rate feeds. The second is a fallback for when the first
 *  is unreachable — both publish the same daily EGP reference. */
const SOURCES = [
  "https://open.er-api.com/v6/latest/USD",
  "https://api.exchangerate-api.com/v4/latest/USD",
]

/** Cached for an hour: the feeds update daily, and payment-settings is
 *  fetched on most pages. */
async function fetchLiveRate(): Promise<number | null> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) continue
      const data = await res.json()
      const rate = Number(data?.rates?.EGP)
      if (Number.isFinite(rate) && rate > 0) return rate
    } catch {
      // try the next source
    }
  }
  return null
}

export type EgpRate = {
  /** What the instructions actually convert at: live (or fallback) + margin. */
  rate: number
  /** The market rate before the margin, for display. */
  liveRate: number | null
  margin: number
  source: "live" | "manual" | "last-known" | "default"
}

/**
 * The USD→EGP rate used on the Egyptian payment instructions: the live market
 * rate plus a per-dollar margin.
 *
 * A manual override wins when set. Otherwise it falls back to the last rate
 * we fetched successfully, so an outage with the feed can't leave customers
 * looking at a wildly wrong figure.
 */
export async function getUsdToEgpRate(): Promise<EgpRate> {
  const supabase = createAdminClient()

  let manual = 0
  let margin = DEFAULT_MARGIN
  let lastKnown = 0
  try {
    const { data } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [USD_TO_EGP_KEY, USD_TO_EGP_MARGIN_KEY, USD_TO_EGP_LIVE_KEY])
    for (const row of data ?? []) {
      const value = Number(row.value)
      if (!Number.isFinite(value)) continue
      if (row.key === USD_TO_EGP_KEY && value > 0) manual = value
      if (row.key === USD_TO_EGP_MARGIN_KEY && value >= 0) margin = value
      if (row.key === USD_TO_EGP_LIVE_KEY && value > 0) lastKnown = value
    }
  } catch (e) {
    console.error("[egp-rate] settings read failed:", e)
  }

  if (manual > 0) return { rate: manual, liveRate: null, margin, source: "manual" }

  const live = await fetchLiveRate()
  if (live) {
    // Keep the fallback fresh. Best-effort: a failed write must not break
    // the page that's asking for a rate.
    supabase
      .from("admin_settings")
      .upsert({ key: USD_TO_EGP_LIVE_KEY, value: String(live), updated_at: new Date().toISOString() }, { onConflict: "key" })
      .then(({ error }) => { if (error) console.error("[egp-rate] cache write failed:", error.message) })
    return { rate: live + margin, liveRate: live, margin, source: "live" }
  }

  if (lastKnown > 0) return { rate: lastKnown + margin, liveRate: lastKnown, margin, source: "last-known" }
  return { rate: DEFAULT_USD_TO_EGP + margin, liveRate: null, margin, source: "default" }
}
