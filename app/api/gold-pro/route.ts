import { NextResponse } from "next/server"

interface GoldProData {
  ounceUSD: number
  ounceKWD: number
  gram24USD: number
  gram24KWD: number
  gram21USD: number
  gram21KWD: number
  gram18USD: number
  gram18KWD: number
  usdToKwd: number
  change24h: number | null
  lastUpdated: string
  source: string
}

export async function GET() {
  try {
    const [goldRes, exchangeRes] = await Promise.all([
      fetch(
        "https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=g",
        { next: { revalidate: 300 } }
      ).catch(() => null),
      fetch(
        "https://open.er-api.com/v6/latest/USD",
        { next: { revalidate: 600 } }
      ).catch(() => null),
    ])

    let ounceUSD: number | null = null
    let gram24USD: number | null = null
    let usdToKwd: number | null = null
    let source = "estimated"
    let change24h: number | null = null

    if (goldRes?.ok) {
      try {
        const goldData = await goldRes.json()
        if (goldData?.metals?.gold) {
          gram24USD = goldData.metals.gold
          ounceUSD = gram24USD! * 31.1035
          source = "metals.dev"
        }
      } catch {}
    }

    if (ounceUSD === null) {
      try {
        const cgRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true",
          { next: { revalidate: 300 } }
        )
        if (cgRes.ok) {
          const cgData = await cgRes.json()
          if (cgData?.["pax-gold"]?.usd) {
            ounceUSD = cgData["pax-gold"].usd
            gram24USD = ounceUSD! / 31.1035
            change24h = cgData["pax-gold"]?.usd_24h_change ?? null
            source = "coingecko-paxg"
          }
        }
      } catch {}
    }

    if (exchangeRes?.ok) {
      try {
        const exData = await exchangeRes.json()
        if (exData?.rates?.KWD) {
          usdToKwd = exData.rates.KWD
        }
      } catch {}
    }

    if (usdToKwd === null) {
      usdToKwd = 0.307
      source += " (estimated-fx)"
    }

    if (ounceUSD === null) {
      ounceUSD = 2650
      gram24USD = ounceUSD / 31.1035
      source = "fallback-estimate"
    }

    const round2 = (n: number) => Math.round(n * 100) / 100

    const gram21USD = gram24USD! * (21 / 24)
    const gram18USD = gram24USD! * (18 / 24)

    const response: GoldProData = {
      ounceUSD: round2(ounceUSD),
      ounceKWD: round2(ounceUSD * usdToKwd),
      gram24USD: round2(gram24USD!),
      gram24KWD: round2(gram24USD! * usdToKwd),
      gram21USD: round2(gram21USD),
      gram21KWD: round2(gram21USD * usdToKwd),
      gram18USD: round2(gram18USD),
      gram18KWD: round2(gram18USD * usdToKwd),
      usdToKwd: round2(usdToKwd),
      change24h: change24h ? round2(change24h) : null,
      lastUpdated: new Date().toISOString(),
      source,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Gold Pro API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch gold prices" },
      { status: 500 }
    )
  }
}
