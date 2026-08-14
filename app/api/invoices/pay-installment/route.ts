import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createOrder } from "@/lib/okx-orders"
import { createNowpaymentsInvoice } from "@/lib/nowpayments"

const OKX_API_BASE = "https://www.okx.com"

function generateSignature(timestamp: string, method: string, requestPath: string, body: string, secretKey: string): string {
  const prehash = `${timestamp}${method}${requestPath}${body}`
  return crypto.createHmac("sha256", secretKey).update(prehash).digest("base64")
}

/** Lets a client pay off a specific outstanding invoice installment — used
 *  for the second (40%) payment of a split-payment purchase, or any other
 *  pending/overdue installment. Reuses the same OKX/NowPayments rails as
 *  checkout, but tags the resulting order with `installment_id` so the
 *  verify/webhook handlers settle the installment instead of granting hours
 *  again. */
export async function POST(request: Request) {
  try {
    const { installmentId, method } = await request.json()
    if (!installmentId || (method !== "okx" && method !== "nowpayments")) {
      return NextResponse.json({ error: "installmentId and a valid method are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const email = user.email.toLowerCase().trim()

    const admin = createAdminClient()
    const { data: installment } = await admin
      .from("invoice_installments")
      .select("id, amount, status, invoice_id, invoices!inner(id, client_email, title, plan)")
      .eq("id", installmentId)
      .single()

    if (!installment) return NextResponse.json({ error: "Installment not found" }, { status: 404 })
    const invoice = Array.isArray(installment.invoices) ? installment.invoices[0] : installment.invoices
    if (!invoice || invoice.client_email !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (installment.status === "paid") return NextResponse.json({ error: "This installment is already paid" }, { status: 400 })

    const amount = Number(installment.amount)
    const plan = invoice.plan || "installment"
    const description = `${invoice.title} — remaining balance`

    if (method === "okx") {
      const accessKey = process.env.OKX_ACCESS_KEY
      const secretKey = process.env.OKX_SECRET_KEY
      const passphrase = process.env.OKX_PASSPHRASE || ""
      if (!accessKey || !secretKey) {
        return NextResponse.json({ error: "OKX Pay is not configured." }, { status: 500 })
      }

      const endpoint = "/api/v5/asset/deposit-address?ccy=USDT"
      const timestamp = new Date().toISOString()
      const signature = generateSignature(timestamp, "GET", endpoint, "", secretKey)
      const response = await fetch(`${OKX_API_BASE}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "OK-ACCESS-KEY": accessKey,
          "OK-ACCESS-SIGN": signature,
          "OK-ACCESS-TIMESTAMP": timestamp,
          "OK-ACCESS-PASSPHRASE": passphrase,
        },
      })
      const data = await response.json()
      if (data.code !== "0" || !data.data?.length) {
        return NextResponse.json({ error: `OKX error: ${data.msg || "Could not fetch deposit address"}` }, { status: 400 })
      }
      const trc20 = data.data.find((d: { chain: string }) => d.chain === "USDT-TRC20")
      const entry = trc20 || data.data[0]
      const orderId = `MENTIX${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      await createOrder({
        orderId,
        plan,
        amount: String(amount),
        email,
        address: entry.addr,
        chain: entry.chain,
        status: "pending",
        createdAt: new Date().toISOString(),
        installmentId,
      })

      return NextResponse.json({
        orderId,
        address: entry.addr,
        chain: entry.chain,
        amount: String(amount),
        currency: "USDT",
        description,
      })
    }

    // NowPayments
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const orderId = `installment-${installmentId}-${Date.now()}`
    const { error: orderError } = await admin.from("nowpayments_orders").insert({
      order_id: orderId,
      plan,
      email,
      full_amount: amount,
      charge_amount: amount,
      split_payment: false,
      installment_id: installmentId,
      status: "pending",
    })
    if (orderError) console.error("[pay-installment] Failed to record NowPayments order:", orderError)

    const npInvoice = await createNowpaymentsInvoice({
      email,
      customerEmail: email,
      amount: Math.round(amount * 1.005 * 100) / 100,
      description,
      successUrl: `${baseUrl}/en/payment/success?provider=nowpayments&plan=${plan}&order=${orderId}`,
      cancelUrl: `${baseUrl}/en/#pricing`,
      orderId,
    })
    if (!npInvoice.invoice_url) throw new Error("No payment URL returned from NowPayments")

    return NextResponse.json({ url: npInvoice.invoice_url })
  } catch (error) {
    console.error("[pay-installment] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
