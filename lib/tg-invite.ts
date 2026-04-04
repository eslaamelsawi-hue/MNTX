/**
 * Telegram Bot API helper for generating one-time invite links.
 * Used to grant starter plan subscribers access to the private Telegram channel.
 *
 * Required env vars:
 *   TG_BOT_TOKEN  — full bot token  (botId:secret)
 *   TG_CHAT_ID    — channel/group ID (e.g. -1001002128842346)
 */

const TG_API = "https://api.telegram.org"

/**
 * Creates a single-use Telegram invite link for the configured channel.
 * Returns the invite URL string, or null if generation fails.
 */
export async function createStarterInviteLink(
  label?: string
): Promise<string | null> {
  const token = process.env.TG_BOT_TOKEN
  const chatId = process.env.TG_CHAT_ID

  if (!token || !chatId) {
    console.warn("[tg-invite] TG_BOT_TOKEN or TG_CHAT_ID not set — skipping")
    return null
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      member_limit: 1,
      creates_join_request: false,
    }
    if (label) body.name = label.slice(0, 32) // Telegram name max 32 chars

    const res = await fetch(
      `${TG_API}/bot${token}/createChatInviteLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )

    const data = await res.json() as {
      ok: boolean
      result?: { invite_link: string }
      description?: string
    }

    if (!data.ok) {
      console.error("[tg-invite] Telegram API error:", data.description)
      return null
    }

    return data.result?.invite_link ?? null
  } catch (err) {
    console.error("[tg-invite] Failed to create invite link:", err)
    return null
  }
}
