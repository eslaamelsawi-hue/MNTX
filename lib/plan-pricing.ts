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

/**
 * Build-your-own mentorship: a $150 base plus a session bundle. The first
 * three sessions are priced as bundles; from the fourth on it's a flat rate
 * per session, which works out cheaper than the 3-session bundle per hour.
 */
export const CUSTOM_MENTORSHIP_BASE = 150
export const CUSTOM_MENTORSHIP_MAX_SESSIONS = 12

export function customMentorshipSessionsPrice(sessions: number): number {
  if (sessions <= 1) return 120
  if (sessions === 2) return 150
  if (sessions === 3) return 220
  return sessions * 70
}

export function customMentorshipPrice(sessions: number): number {
  return CUSTOM_MENTORSHIP_BASE + customMentorshipSessionsPrice(sessions)
}

/** "mentorship-custom-3" → 3, or null for any other plan id. */
export function parseCustomMentorshipSessions(planId: string): number | null {
  const match = /^mentorship-custom-(\d{1,2})$/.exec(planId)
  if (!match) return null
  const sessions = parseInt(match[1], 10)
  return sessions >= 1 && sessions <= CUSTOM_MENTORSHIP_MAX_SESSIONS ? sessions : null
}

// Registered up front so every checkout route can price them the same way
// it prices a fixed plan — the browser only ever sends the plan id.
for (let n = 1; n <= CUSTOM_MENTORSHIP_MAX_SESSIONS; n++) {
  PLAN_PRICES[`mentorship-custom-${n}`] = {
    amount: customMentorshipPrice(n),
    description: `Mentix Trading - Custom Mentorship (${n} ${n === 1 ? "session" : "sessions"})`,
  }
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
