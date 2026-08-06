"use client"

import { useCallback, useState } from "react"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { startCheckoutSession } from "@/app/actions/stripe"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

export default function Checkout({ productId }: { productId: string }) {
  const [checked, setChecked] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const fetchClientSecret = useCallback(
    () => startCheckoutSession(productId),
    [productId]
  )

  if (!confirmed) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
          ⚠️ All payments are final and non-refundable.
        </p>
        <label className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>I understand this payment is final and non-refundable.</span>
        </label>
        <button
          type="button"
          disabled={!checked}
          onClick={() => setConfirmed(true)}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Payment
        </button>
      </div>
    )
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret: fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
