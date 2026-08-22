import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

const DISCORD_API = "https://discord.com/api/v10"

function configured(): boolean {
  return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID && process.env.DISCORD_VIP_ROLE_ID)
}

function botHeaders() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" }
}

/** Adds the VIP MAX role to a raw Discord user id. Silent no-op if the bot
 *  isn't configured — never blocks the purchase flow that calls this. */
export async function grantVipRole(discordUserId: string): Promise<void> {
  if (!configured()) return
  try {
    await fetch(`${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${process.env.DISCORD_VIP_ROLE_ID}`, {
      method: "PUT",
      headers: botHeaders(),
    })
  } catch (e) {
    console.error("[discord] grantVipRole failed:", e)
  }
}

export async function revokeVipRole(discordUserId: string): Promise<void> {
  if (!configured()) return
  try {
    await fetch(`${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${process.env.DISCORD_VIP_ROLE_ID}`, {
      method: "DELETE",
      headers: botHeaders(),
    })
  } catch (e) {
    console.error("[discord] revokeVipRole failed:", e)
  }
}

/** Ensures the user has actually joined the server (harmless no-op if
 *  they're already a member) using the OAuth access token from the
 *  "Connect Discord" flow. */
export async function joinGuildIfNeeded(discordUserId: string, accessToken: string): Promise<void> {
  if (!configured()) return
  try {
    await fetch(`${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}`, {
      method: "PUT",
      headers: botHeaders(),
      body: JSON.stringify({ access_token: accessToken }),
    })
  } catch (e) {
    console.error("[discord] joinGuildIfNeeded failed:", e)
  }
}

/** True if this client currently has a non-cancelled coaching-plan
 *  subscription on file — the entitlement gate for the VIP MAX role. */
async function qualifiesForVip(email: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("client_email", email.toLowerCase().trim())
    .eq("plan", "coaching")
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle()
  return !!data
}

/** Grants the VIP MAX role to a client's linked Discord account, if any.
 *  Called right after a coaching purchase completes, and from the OAuth
 *  callback when a client links Discord after already having coaching. */
export async function grantVipRoleForEmail(email: string): Promise<void> {
  if (!configured()) return
  const normalized = email.toLowerCase().trim()
  const supabase = createAdminClient()
  const { data: link } = await supabase.from("discord_links").select("discord_user_id").eq("client_email", normalized).maybeSingle()
  if (!link) return
  await grantVipRole(link.discord_user_id)
  await supabase.from("discord_links").update({ role_granted: true, updated_at: new Date().toISOString() }).eq("client_email", normalized)
}

/** Revokes the VIP MAX role — called when an admin cancels a coaching
 *  subscription. Keeps the Discord link on file (just marks it un-granted)
 *  so the role comes right back if they're ever re-subscribed. */
export async function revokeVipRoleForEmail(email: string): Promise<void> {
  if (!configured()) return
  const normalized = email.toLowerCase().trim()
  const supabase = createAdminClient()
  const { data: link } = await supabase.from("discord_links").select("discord_user_id").eq("client_email", normalized).maybeSingle()
  if (!link) return
  await revokeVipRole(link.discord_user_id)
  await supabase.from("discord_links").update({ role_granted: false, updated_at: new Date().toISOString() }).eq("client_email", normalized)
}

export { qualifiesForVip }
