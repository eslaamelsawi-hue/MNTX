/** USD → EGP for the manual Egyptian payment instructions.
 *
 *  The rate is admin-configurable (admin_settings: usd_to_egp_rate) rather
 *  than fetched live: the pound's market rate drifts from the official one,
 *  and the business wants to set its own with a margin. Plan prices are then
 *  converted from it, so there are no per-plan EGP figures to maintain. */
export const DEFAULT_USD_TO_EGP = 50
/** Manual override; blank or 0 means "use the live rate". */
export const USD_TO_EGP_KEY = "usd_to_egp_rate"
/** Added on top of the live rate, per dollar. */
export const USD_TO_EGP_MARGIN_KEY = "usd_to_egp_margin"
/** Last live rate we successfully fetched, kept as a fallback. */
export const USD_TO_EGP_LIVE_KEY = "usd_to_egp_live"
export const DEFAULT_MARGIN = 1

/** Rounds up to the nearest 50 EGP — a clean figure to transfer, and
 *  rounding up means conversion drift never under-collects. */
export function usdToEgp(usd: number, rate: number): number {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || usd <= 0 || rate <= 0) return 0
  return Math.ceil((usd * rate) / 50) * 50
}

export function formatEgp(amount: number): string {
  return amount.toLocaleString("en-US")
}

/** The Instapay payment link the "transfer now" button opens. Editable in
 *  admin, so a new link never needs a deploy. */
export const EGYPT_INSTAPAY_LINK_KEY = "egypt_instapay_link"
export const DEFAULT_INSTAPAY_LINK = "https://ipn.eg/S/eeslamfx/instapay/2V1nNO"
