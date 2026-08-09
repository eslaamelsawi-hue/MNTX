import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const KEYS = [
  "subscriptions_open",
  "payment_okx_enabled",
  "payment_nowpayments_enabled",
  "payment_stripe_enabled",
  "payment_egypt_enabled",
]

/**
 * Public (no auth) read-only feature-flag endpoint the checkout UI polls to
 * decide what to show — whether new subscriptions are open at all, and which
 * individual payment methods are enabled. Missing rows default to enabled/open
 * so the site works normally until an admin explicitly turns something off.
 */
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("admin_settings").select("key, value").in("key", KEYS)
  if (error) {
    // Fail open — a settings read error shouldn't block legitimate checkouts.
    return NextResponse.json({
      subscriptionsOpen: true,
      okx: true,
      nowpayments: true,
      stripe: true,
      egypt: true,
    })
  }

  const raw: Record<string, string> = {}
  for (const row of data || []) raw[row.key] = row.value
  const flag = (key: string) => raw[key] !== "false"

  return NextResponse.json({
    subscriptionsOpen: flag("subscriptions_open"),
    okx: flag("payment_okx_enabled"),
    nowpayments: flag("payment_nowpayments_enabled"),
    stripe: flag("payment_stripe_enabled"),
    egypt: flag("payment_egypt_enabled"),
  })
}
