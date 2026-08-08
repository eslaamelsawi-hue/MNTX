import { NextResponse } from "next/server"
import crypto from "crypto"

const BINANCE_PAY_API = "https://bpay.binanceapi.com"

function generateNonce(length = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let nonce = ""
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return nonce
}

function generateSignature(
  timestamp: number,
  nonce: string,
  body: string,
  secretKey: string
): string {
  const payload = `${timestamp}\n${nonce}\n${body}\n`
  return crypto
    .createHmac("sha512", secretKey)
    .update(payload)
    .digest("hex")
    .toUpperCase()
}

export async function POST(request: Request) {
  try {
    const { plan } = await request.json()

    const apiKey = process.env.BINANCE_PAY_API_KEY
    const secretKey = process.env.BINANCE_PAY_SECRET_KEY

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: "Binance Pay is not configured. Please add API credentials." },
        { status: 500 }
      )
    }

    let orderAmount: number
    let description: string

    if (plan === "starter") {
      orderAmount = 199
      description = "Mentix Trading - ADVANCED SMC Course (Starter Plan)"
    } else if (plan === "coaching") {
      orderAmount = 999
      description = "Mentix Trading - 1-on-1 Coaching Plan"
    } else {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    const timestamp = Date.now()
    const nonce = generateNonce(32)
    const merchantTradeNo = `MENTIX${timestamp}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const requestBody = JSON.stringify({
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo,
      orderAmount,
      currency: "USDT",
      description,
      goodsDetails: [
        {
          goodsType: "02",
          goodsCategory: "Z000",
          referenceGoodsId: plan === "starter" ? "MENTIX_STARTER" : "MENTIX_COACHING",
          goodsName: description,
          goodsDetail: description,
        },
      ],
    })

    const signature = generateSignature(timestamp, nonce, requestBody, secretKey)

    const response = await fetch(`${BINANCE_PAY_API}/binancepay/openapi/v3/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp.toString(),
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: requestBody,
    })

    const data = await response.json()

    if (data.status === "SUCCESS" && data.data) {
      return NextResponse.json({
        checkoutUrl: data.data.universalUrl || data.data.deeplink,
        prepayId: data.data.prepayId,
        qrContent: data.data.qrContent,
      })
    }

    return NextResponse.json(
      { error: data.errorMessage || "Failed to create Binance Pay order" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Binance Pay error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
