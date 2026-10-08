import "server-only"

const WHOP_API_BASE = "https://api.whop.com/api/v1"

/** Mentix Trading's Whop business account + the product every dynamically
 *  created plan/checkout gets attached under. Not secrets — just identifiers
 *  for this specific account, resolved once via the API. */
export const WHOP_COMPANY_ID = "biz_tg5dsyXfc2WEuE"
export const WHOP_PRODUCT_ID = "prod_0fEzfAY6V8MqC"

/**
 * Creates a one-time-payment checkout on Whop for the given amount and
 * returns its hosted checkout URL to redirect the buyer to. Mirrors the
 * OKX/NowPayments flow: we never trust the browser-side redirect back —
 * the `payment.succeeded` webhook (see app/api/webhooks/whop) is what
 * actually grants access.
 */
export async function createWhopCheckout(opts: {
  planLabel: string
  amount: number
  redirectUrl: string
  metadata: Record<string, string>
}): Promise<{ url: string; checkoutId: string }> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) throw new Error("Whop is not configured — set WHOP_API_KEY.")

  const res = await fetch(`${WHOP_API_BASE}/checkout_configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "payment",
      plan: {
        company_id: WHOP_COMPANY_ID,
        product_id: WHOP_PRODUCT_ID,
        currency: "usd",
        title: opts.planLabel,
        plan_type: "one_time",
        initial_price: opts.amount,
      },
      redirect_url: opts.redirectUrl,
      metadata: opts.metadata,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Whop checkout creation failed (${res.status}): ${body || res.statusText}`)
  }

  const data = await res.json()
  if (!data.purchase_url) throw new Error("Whop did not return a purchase_url")
  return { url: data.purchase_url, checkoutId: data.id }
}
