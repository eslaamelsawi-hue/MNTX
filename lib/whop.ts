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
        title: opts.planLabel.slice(0, 30),
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

/**
 * Creates a Whop checkout that bills in two instalments, 30 days apart, by
 * charging the card the buyer pays with the first time — Whop's native split
 * pay, so there's no card data on our side.
 *
 * Split pay only exists on a real plan (the inline plan accepted by
 * /checkout_configurations silently drops the field), so a hidden plan is
 * created first and the checkout points at it. The plan carries the two
 * amounts: initial_price now, renewal_price in 30 days.
 */
export async function createWhopSplitCheckout(opts: {
  planLabel: string
  firstAmount: number
  secondAmount: number
  redirectUrl: string
  metadata: Record<string, string>
}): Promise<{ url: string; checkoutId: string; planId: string }> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) throw new Error("Whop is not configured — set WHOP_API_KEY.")

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }

  const planRes = await fetch(`${WHOP_API_BASE}/plans`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      product_id: WHOP_PRODUCT_ID,
      currency: "usd",
      title: opts.planLabel.slice(0, 30),
      billing_type: "renewal",
      billing_period: 30,
      // Whop stops after this many charges instead of renewing forever.
      split_pay_required_payments: 2,
      initial_price: opts.firstAmount,
      renewal_price: opts.secondAmount,
      visibility: "hidden",
    }),
  })
  if (!planRes.ok) {
    const body = await planRes.text().catch(() => "")
    throw new Error(`Whop split plan creation failed (${planRes.status}): ${body.slice(0, 200) || planRes.statusText}`)
  }
  const plan = await planRes.json()
  if (!plan?.id) throw new Error("Whop did not return a plan id")

  const checkoutRes = await fetch(`${WHOP_API_BASE}/checkout_configurations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      plan_id: plan.id,
      redirect_url: opts.redirectUrl,
      metadata: opts.metadata,
    }),
  })
  if (!checkoutRes.ok) {
    const body = await checkoutRes.text().catch(() => "")
    throw new Error(`Whop split checkout failed (${checkoutRes.status}): ${body.slice(0, 200) || checkoutRes.statusText}`)
  }
  const checkout = await checkoutRes.json()
  if (!checkout?.purchase_url) throw new Error("Whop did not return a purchase_url")

  return { url: checkout.purchase_url, checkoutId: checkout.id, planId: plan.id }
}

type WhopPayment = {
  id: string
  status?: string
  checkout_configuration_id?: string | null
  metadata?: Record<string, string> | null
}

/**
 * Asks Whop directly whether an order was paid, so a webhook that never
 * arrives can't leave a real payment sitting as "pending".
 *
 * Whop's /payments endpoint ignores filter params (passing
 * checkout_configuration_id or status still returns the full recent list),
 * so the match is done here — on the order_id we attached as checkout
 * metadata, falling back to the checkout id we stored on the order.
 */
export async function findWhopPayment(opts: {
  orderId: string
  checkoutId?: string | null
}): Promise<{ found: boolean; paid: boolean; paymentId?: string }> {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) throw new Error("Whop is not configured — set WHOP_API_KEY.")

  const res = await fetch(`${WHOP_API_BASE}/payments`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Whop payment lookup failed (${res.status}): ${body.slice(0, 200) || res.statusText}`)
  }

  const data = await res.json()
  const payments: WhopPayment[] = Array.isArray(data?.data) ? data.data : []
  const match = payments.find(
    (p) =>
      p?.metadata?.order_id === opts.orderId ||
      (!!opts.checkoutId && p?.checkout_configuration_id === opts.checkoutId)
  )

  if (!match) return { found: false, paid: false }
  return { found: true, paid: match.status === "paid", paymentId: match.id }
}
