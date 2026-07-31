/** Shared plan → price lookup. Used by the OKX crypto checkout flow and by
 *  admin subscription creation (to auto-generate a matching invoice). */
export const PLAN_PRICES: Record<string, { amount: number; description: string }> = {
  test:        { amount: 1,    description: "Mentix Trading - Test Plan" },
  "gold-pro":  { amount: 100, description: "Mentix Trading - Gold Pro Monthly Analysis" },
  starter:     { amount: 379,  description: "Mentix Trading - ADVANCED SMC Course" },
  coaching:    { amount: 900, description: "Mentix Trading - 1-on-1 Coaching Plan" },
  "extend-1m": { amount: 250,  description: "Mentix Trading - Mentorship Extension 1 Month" },
  "extend-2m": { amount: 449,  description: "Mentix Trading - Mentorship Extension 2 Months" },
  "extend-3m": { amount: 900,  description: "Mentix Trading - Mentorship Extension 3 Months" },
  "extend-6m": { amount: 1499, description: "Mentix Trading - Mentorship Extension 6 Months" },
  "funded-challenge": { amount: 500, description: "Mentix Trading - PropFirm Mastery Course" },
}
