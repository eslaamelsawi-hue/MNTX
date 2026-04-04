import { NextResponse } from "next/server"

/**
 * GET /api/tg-bot/setup
 * Diagnostic endpoint — tests whether the Telegram bot is correctly configured.
 * Tries to create an invite link and returns a detailed result.
 * Remove or protect this endpoint in production after setup is confirmed.
 */
export async function GET() {
  const token = process.env.TG_BOT_TOKEN
  const chatId = process.env.TG_CHAT_ID

  const checks: Record<string, string> = {}

  if (!token) {
    checks.TG_BOT_TOKEN = "❌ NOT SET"
  } else {
    checks.TG_BOT_TOKEN = `✅ Set (starts with ${token.slice(0, 6)}...)`
  }

  if (!chatId) {
    checks.TG_CHAT_ID = "❌ NOT SET"
  } else {
    checks.TG_CHAT_ID = `✅ Set (${chatId})`
  }

  if (!token || !chatId) {
    return NextResponse.json({
      ok: false,
      checks,
      error: "Missing env vars. Set TG_BOT_TOKEN and TG_CHAT_ID in Vercel.",
    })
  }

  // Test 1: get bot info
  const botRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const botData = await botRes.json() as { ok: boolean; result?: { username: string; id: number }; description?: string }

  if (!botData.ok) {
    return NextResponse.json({
      ok: false,
      checks,
      error: `Bot token invalid: ${botData.description}`,
    })
  }

  checks.bot_username = `✅ @${botData.result?.username} (id: ${botData.result?.id})`

  // Test 2: get chat info
  const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  })
  const chatData = await chatRes.json() as { ok: boolean; result?: { title: string; type: string }; description?: string }

  if (!chatData.ok) {
    return NextResponse.json({
      ok: false,
      checks,
      error: `Cannot access chat. Bot may not be a member. Error: ${chatData.description}`,
      hint: "Add the bot to your Telegram group/channel and make it an admin.",
    })
  }

  checks.chat_title = `✅ "${chatData.result?.title}" (type: ${chatData.result?.type})`

  // Test 3: create a test invite link
  const inviteRes = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, member_limit: 1, name: "Setup-Test" }),
  })
  const inviteData = await inviteRes.json() as { ok: boolean; result?: { invite_link: string }; description?: string }

  if (!inviteData.ok) {
    return NextResponse.json({
      ok: false,
      checks,
      error: `Cannot create invite link: ${inviteData.description}`,
      hint: "Make sure the bot is an admin with 'Invite users via link' permission.",
    })
  }

  checks.invite_link = `✅ Generated: ${inviteData.result?.invite_link}`

  return NextResponse.json({
    ok: true,
    checks,
    message: "Everything is working correctly! Telegram invites will be sent on purchase.",
    test_invite_link: inviteData.result?.invite_link,
  })
}
