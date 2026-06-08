import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function GET() {
  try {
    console.log("\n🧪 === TOKEN TEST ===")

    const clientId = process.env.ZOOM_CLIENT_ID
    const clientSecret = process.env.ZOOM_CLIENT_SECRET

    console.log("Step 1: Check credentials")
    console.log("ZOOM_CLIENT_ID exists:", !!clientId)
    console.log("ZOOM_CLIENT_SECRET exists:", !!clientSecret)

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: "Missing credentials",
        ZOOM_CLIENT_ID: clientId ? "SET" : "MISSING",
        ZOOM_CLIENT_SECRET: clientSecret ? "SET" : "MISSING",
      })
    }

    console.log("Step 2: Create JWT payload")
    const payload = {
      iss: clientId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    console.log("Payload:", payload)

    console.log("Step 3: Sign JWT")
    const token = jwt.sign(payload, clientSecret)
    console.log("Token created (first 50 chars):", token.substring(0, 50))

    console.log("Step 4: Request access token from Zoom")
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }).toString()

    console.log("Request body:", body.substring(0, 100) + "...")

    const response = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    console.log("Step 5: Zoom response")
    console.log("Status:", response.status)
    console.log("Status OK:", response.ok)

    const responseText = await response.text()
    console.log("Response (first 200 chars):", responseText.substring(0, 200))

    if (!response.ok) {
      return NextResponse.json({
        error: "Token request failed",
        status: response.status,
        response: responseText,
      })
    }

    const data = JSON.parse(responseText)
    return NextResponse.json({
      success: true,
      access_token: data.access_token ? `✓ Received (${data.access_token.substring(0, 20)}...)` : "No token in response",
      expires_in: data.expires_in,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
