/** USD → EGP for the manual Egyptian payment instructions.
 *
 *  The rate is admin-configurable (admin_settings: usd_to_egp_rate) rather
 *  than fetched live: the pound's market rate drifts from the official one,
 *  and the business wants to set its own with a margin. Plan prices are then
 *  converted from it, so there are no per-plan EGP figures to maintain. */
export const DEFAULT_USD_TO_EGP = 50
export const USD_TO_EGP_KEY = "usd_to_egp_rate"

/** Rounds up to the nearest 50 EGP — a clean figure to transfer, and
 *  rounding up means conversion drift never under-collects. */
export function usdToEgp(usd: number, rate: number): number {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || usd <= 0 || rate <= 0) return 0
  return Math.ceil((usd * rate) / 50) * 50
}

export function formatEgp(amount: number): string {
  return amount.toLocaleString("en-US")
}
