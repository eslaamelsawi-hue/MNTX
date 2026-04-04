/**
 * BotSubscription (TGmembership) access-token helper.
 *
 * Access tokens are pre-generated in bulk via the Telegram bot:
 *   /members → Add/Delete access token → Create new → Multiple
 * The bot sends a CSV file; the "Access Token" column values are uploaded
 * to the `tg_access_tokens` Supabase table via POST /api/tg-bot/tokens.
 *
 * When a Starter-plan payment is confirmed we atomically claim one unused
 * token from the table and return the BotSubscription activation link:
 *   https://t.me/<BOT_USERNAME>?start=<TOKEN>
 *
 * Required env vars:
 *   TG_BOT_USERNAME — e.g. mentixbot  (no @)
 */

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Claims one unused BotSubscription access token for the Starter plan
 * and returns the activation link.  Marks the token as used atomically.
 * Returns null when no tokens remain (alert admin to generate more).
 */
export async function createStarterInviteLink(
  orderRef?: string
): Promise<string | null> {
  const botUsername = process.env.TG_BOT_USERNAME
  if (!botUsername) {
    console.warn("[tg-invite] TG_BOT_USERNAME not set — skipping")
    return null
  }

  const supabase = createAdminClient()

  // Atomically fetch and mark one unused token used.
  // Using a Postgres function avoids race conditions on concurrent payments.
  const { data, error } = await supabase.rpc("claim_tg_access_token", {
    p_plan: "starter",
    p_order_ref: orderRef ?? null,
  }) as { data: string | null; error: unknown }

  if (error) {
    console.error("[tg-invite] DB error claiming token:", error)
    return null
  }

  if (!data) {
    console.error("[tg-invite] No unused tokens available for starter plan — upload more via POST /api/tg-bot/tokens")
    return null
  }

  return `https://t.me/${botUsername}?start=accesstoken_${data}`
}
