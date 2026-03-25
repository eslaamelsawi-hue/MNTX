import "server-only"

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1"

export async function createNowpaymentsInvoice(params: {
  email: string
  amount: number
  description: string
  successUrl: string
  cancelUrl: string
  orderId: string
}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY

  if (!apiKey) {
    throw new Error("NOWPAYMENTS_API_KEY environment variable is required")
  }

  const invoiceData = {
    price_amount: params.amount,
    price_currency: "usd",
    order_id: params.orderId,
    order_description: params.description,
    ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/webhooks/nowpayments`,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    is_fixed_rate: true,
    is_fee_paid_by_user: false,
  }

  const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invoiceData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(
      `Nowpayments API error: ${errorData.message || response.statusText}`
    )
  }

  const data = await response.json()
  return data
}