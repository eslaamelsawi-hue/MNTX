import "server-only"

/**
 * Tradable instruments for the certification test's virtual trading
 * challenge. Deliberately limited to USD-quoted pairs/CFDs so P/L math never
 * needs a cross-currency conversion: pnl_usd = (exit - entry) * units.
 */
export const TRADABLE_INSTRUMENTS: Record<string, string> = {
  EUR_USD: "EUR/USD",
  GBP_USD: "GBP/USD",
  AUD_USD: "AUD/USD",
  NZD_USD: "NZD/USD",
  XAU_USD: "Gold (XAU/USD)",
  US30_USD: "Dow Jones 30",
  SPX500_USD: "S&P 500",
  NAS100_USD: "Nasdaq 100",
}

function config() {
  const apiKey = process.env.OANDA_API_KEY
  const accountId = process.env.OANDA_ACCOUNT_ID
  if (!apiKey || !accountId) return null
  const env = process.env.OANDA_ENV || "practice"
  const base = env === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com"
  return { apiKey, accountId, base }
}

export function isOandaConfigured(): boolean {
  return !!config()
}

/** Current tradeable bid/ask for each requested instrument, straight from OANDA. */
export async function getOandaPrices(instruments: string[]): Promise<Record<string, { bid: number; ask: number }>> {
  const cfg = config()
  if (!cfg) throw new Error("OANDA is not configured — set OANDA_API_KEY and OANDA_ACCOUNT_ID.")
  if (instruments.length === 0) return {}

  const url = `${cfg.base}/v3/accounts/${cfg.accountId}/pricing?instruments=${instruments.join(",")}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`OANDA pricing error (${res.status}): ${body || res.statusText}`)
  }
  const data = await res.json()

  const out: Record<string, { bid: number; ask: number }> = {}
  for (const p of data.prices ?? []) {
    const bid = parseFloat(p.closeoutBid ?? p.bids?.[0]?.price)
    const ask = parseFloat(p.closeoutAsk ?? p.asks?.[0]?.price)
    if (!Number.isNaN(bid) && !Number.isNaN(ask)) out[p.instrument] = { bid, ask }
  }
  return out
}
