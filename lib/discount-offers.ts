import "server-only"
import crypto from "crypto"

// Scoped to coaching for now — it's the only plan the checkout page (and
// its coupon-code field) fully supports end-to-end today.
export const OFFER_PLAN = "coaching"
export const OFFER_PLAN_LABEL = "1-on-1 Coaching Plan"

export function generateCouponCode(): string {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)
  return `DEAL${suffix}`
}
