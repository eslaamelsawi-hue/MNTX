import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID

  return NextResponse.json({
    credentials: {
      ZOOM_CLIENT_ID: clientId ? `✓ Set (${clientId.substring(0, 10)}...)` : "✗ Missing",
      ZOOM_CLIENT_SECRET: clientSecret ? `✓ Set (${clientSecret.substring(0, 10)}...)` : "✗ Missing",
      ZOOM_ACCOUNT_ID: accountId ? `✓ Set (${accountId})` : "✗ Missing",
    },
    allSet: !!clientId && !!clientSecret && !!accountId,
  })
}
