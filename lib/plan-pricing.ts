/** Shared plan → price lookup. Used by the OKX crypto checkout flow and by
 *  admin subscription creation (to auto-generate a matching invoice). */
export const PLAN_PRICES: Record<string, { amount: number; description: string }> = {
  test:        { amount: 1,    description: "Mentix Trading - Test Plan" },
  "gold-pro":  { amount: 100, description: "Mentix Trading - Gold Pro Monthly Analysis" },
  starter:     { amount: 379,  description: "Mentix Trading - ADVANCED SMC Course" },
  coaching:    { amount: 1200, description: "Mentix Trading - 1-on-1 Coaching Plan" },
  "extend-1m": { amount: 250,  description: "Mentix Trading - Mentorship Extension 1 Month" },
  "extend-2m": { amount: 449,  description: "Mentix Trading - Mentorship Extension 2 Months" },
  "extend-3m": { amount: 900,  description: "Mentix Trading - Mentorship Extension 3 Months" },
  "extend-6m": { amount: 1499, description: "Mentix Trading - Mentorship Extension 6 Months" },
  "funded-challenge": { amount: 500, description: "Mentix Trading - PropFirm Mastery Course" },
  // Consultation: $100 for the first hour, +$80 per additional hour.
  "consultation-1h": { amount: 100, description: "Mentix Trading - 1-Hour Consultation" },
  "consultation-2h": { amount: 180, description: "Mentix Trading - 2-Hour Consultation" },
  "consultation-3h": { amount: 260, description: "Mentix Trading - 3-Hour Consultation" },
  "consultation-4h": { amount: 340, description: "Mentix Trading - 4-Hour Consultation" },
  "consultation-5h": { amount: 420, description: "Mentix Trading - 5-Hour Consultation" },
}

/** Defaults for the mentorship offer. Both are overridable from the admin
 *  dashboard (admin_settings: mentorship_price / mentorship_discount_percent)
 *  — read them through lib/mentorship-pricing's getMentorshipPricing() on the
 *  server. These statics are only the fallback when nothing is configured. */
export const DEFAULT_MENTORSHIP_PRICE = PLAN_PRICES.coaching.amount
export const DEFAULT_MENTORSHIP_DISCOUNT_PERCENT = 50

export function discountedPrice(price: number, discountPercent: number): number {
  return Math.round(price * (1 - discountPercent / 100))
}
