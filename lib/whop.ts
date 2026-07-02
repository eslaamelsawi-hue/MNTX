/**
 * Whop hosted card-checkout links, keyed by internal plan id.
 * After purchase, Whop redirects the buyer to the URL configured on the plan
 * in the Whop dashboard — point that at:
 *   {baseUrl}/{locale}/payment/success?plan={plan}&provider=whop
 * Whop appends its own `receipt_id`, which the success page reads as the order ref.
 */
export const WHOP_CHECKOUT_LINKS: Record<string, string> = {
  starter: "https://whop.com/checkout/plan_bAvnJpC9SmIIa",
}

/** Base checkout link for a plan, or null if Whop isn't configured for it. */
export function whopCheckoutUrl(plan: string): string | null {
  return WHOP_CHECKOUT_LINKS[plan] ?? null
}

/**
 * The URL to set as the plan's post-checkout redirect inside the Whop dashboard.
 * Kept here so the success-page contract lives in one place.
 */
export function whopSuccessRedirect(plan: string, locale = "en", baseUrl = ""): string {
  const root = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || ""
  return `${root}/${locale}/payment/success?plan=${plan}&provider=whop`
}
