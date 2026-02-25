import { NextResponse } from "next/server"

interface GoldPriceData {
  ounceUSD: number | null
  ounceEGP: number | null
  gram24: number | null
  gram21: number | null
  gram18: number | null
  usdToEgp: number | null
  lastUpdated: string
  change24h: number | null
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
    let usdToEgp: number | null = null
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
        if (exData?.rates?.EGP) {
          usdToEgp = exData.rates.EGP
        }
      } catch {}
    }

    if (usdToEgp === null) {
      usdToEgp = 50.5
      source += " (estimated-fx)"
    }

    if (ounceUSD === null) {
      ounceUSD = 2650
      gram24USD = ounceUSD / 31.1035
      source = "fallback-estimate"
    }

    const ounceEGP = ounceUSD * usdToEgp
    const gram24EGP = gram24USD! * usdToEgp
    const gram21EGP = gram24EGP * (21 / 24)
    const gram18EGP = gram24EGP * (18 / 24)

    const response: GoldPriceData = {
      ounceUSD: Math.round(ounceUSD * 100) / 100,
      ounceEGP: Math.round(ounceEGP * 100) / 100,
      gram24: Math.round(gram24EGP * 100) / 100,
      gram21: Math.round(gram21EGP * 100) / 100,
      gram18: Math.round(gram18EGP * 100) / 100,
      usdToEgp: Math.round(usdToEgp * 100) / 100,
      lastUpdated: new Date().toISOString(),
      change24h: change24h ? Math.round(change24h * 100) / 100 : null,
      source,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Gold API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch gold prices" },
      { status: 500 }
    )
  }
}