"use client"
import { IngotCalculator } from "@/components/ingot-calculator"
// Gold Pro Page Component

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Scale,
  DollarSign,
  Shield,
  Target,
  BarChart3,
  Lock,
  Crown,
  CheckCircle2,
  Loader2,
  Eye,
  ChevronsUpDown,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { OKXPayButton, NowPaymentsButton } from "@/components/payment-buttons"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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

type Currency = "USD" | "KWD"

function formatPrice(price: number, currency: Currency): string {
  if (currency === "KWD") return price.toFixed(2) + " KWD"
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function useAnalysis() {
  return {
    prediction: "bullish" as const,
    predictedHigh: 2780,
    predictedLow: 2580,
    confidence: 73,
    support: [2600, 2550, 2500],
    resistance: [2720, 2780, 2850],
    recommendation: "BUY" as const,
    recommendationReason: "Gold is showing strong bullish momentum with key support levels holding firm. Technical indicators suggest upward continuation.",
    analysis: "Gold prices continue to show strength amid global economic uncertainty. The precious metal has been trading above its 50-day moving average, indicating sustained bullish momentum. Key support levels remain intact while resistance levels are being tested. Central bank purchases and geopolitical tensions continue to provide fundamental support for higher gold prices in the near term.",
  }
}

export function GoldProPage() {
  const t = useTranslations("goldPro")
  const [currency, setCurrency] = useState<Currency>("KWD")
  const [email, setEmail] = useState("")
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(false)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const analysis = useAnalysis()

  const { data, error, isLoading, mutate } = useSWR<GoldProData>("/api/gold-pro", fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: false,
  })

  const isPositive = (data?.change24h ?? 0) >= 0


  const getPrice = (usd: number, kwd: number) => formatPrice(currency === "USD" ? usd : kwd, currency)


  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  useEffect(() => {
    if (data?.lastUpdated) {
      setLastRefresh(
        new Date(data.lastUpdated).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    }
  }, [data?.lastUpdated])

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <Badge variant="outline" className="mb-4 border-yellow-500/30 text-yellow-500">
          <Crown className="mr-1.5 h-3.5 w-3.5" />
          {t("badge")}
        </Badge>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t("title")} <span className="text-yellow-500">{t("titleHighlight")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground leading-relaxed">
          {t("description")}
        </p>
        {lastRefresh && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("lastUpdated")}: {lastRefresh}
          </p>
        )}
      </div>

      <div className="mb-8 flex items-center justify-center gap-2">
        <Button variant={currency === "USD" ? "default" : "outline"} size="sm" className={currency === "USD" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "border-yellow-500/30"} onClick={() => setCurrency("USD")}>
          <DollarSign className="mr-1 h-4 w-4" /> USD
        </Button>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        <Button variant={currency === "KWD" ? "default" : "outline"} size="sm" className={currency === "KWD" ? "bg-yellow-500 text-black hover:bg-yellow-600" : "border-yellow-500/30"} onClick={() => setCurrency("KWD")}>
          KWD
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-400 opacity-50" />
          <p className="text-lg font-medium text-foreground">{t("errorTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("errorDescription")}</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
          </Button>
        </div>
      )}

      {data && !error && !isLoading && (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-center gap-6 rounded-xl border border-border bg-card p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("ouncePrice")}</p>
              <p className="mt-1 font-bold text-foreground">{getPrice(data.ounceUSD, data.ounceKWD)}</p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("exchangeRate")}</p>
              <p className="mt-1 font-bold text-foreground">1 USD = {data.usdToKwd.toFixed(3)} KWD</p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("change24h")}</p>
              <p className={`mt-1 font-bold flex items-center justify-center gap-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {data.change24h !== null ? `${Math.abs(data.change24h).toFixed(2)}%` : "--"}
              </p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Button variant="ghost" size="sm" onClick={() => mutate()} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {t("refresh")}
            </Button>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{t("ounceCard")}</p>
                <p className="mt-1 text-xl font-bold text-yellow-500">{getPrice(data.ounceUSD, data.ounceKWD)}</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{t("gram24")}</p>
                <p className="mt-1 text-xl font-bold text-yellow-500">{getPrice(data.gram24USD, data.gram24KWD)}</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{t("gram21")}</p>
                <p className="mt-1 text-xl font-bold text-yellow-500">{getPrice(data.gram21USD, data.gram21KWD)}</p>
              </CardContent>
            </Card>
          </div>

          <IngotCalculator currency="KWD" embedded />

          {!hasAccess ? (
            <div className="relative">
              <div className="pointer-events-none select-none blur-md opacity-40">
                <AnalysisContent t={t} analysis={analysis} currency={currency} getPrice={getPrice} isPositive={isPositive} data={data} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Card className="w-full max-w-md border-yellow-500/30 bg-background/95 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <Lock className="mx-auto mb-4 h-10 w-10 text-yellow-500" />
                    <h3 className="text-xl font-bold text-foreground">{t("paywallTitle")}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t("paywallDescription")}</p>
                    <ul className="my-6 space-y-2 text-left text-sm">
                      {[t("paywallFeature1"), t("paywallFeature2"), t("paywallFeature3"), t("paywallFeature4")].map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                          <Shield className="h-4 w-4 text-yellow-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <p className="mb-4 text-3xl font-bold text-foreground">
                      $100<span className="text-sm font-normal text-muted-foreground">/{t("month")}</span>
                    </p>
                    <div className="space-y-2">
                      {!showPaymentOptions ? (
                        <>
                          <Input placeholder={t("emailPlaceholder")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-yellow-500/30" />
                          <Button
                            className="w-full bg-yellow-500 text-black hover:bg-yellow-600"
                            disabled={!email}
                            onClick={() => {
                              if (!email || !email.includes("@")) return
                              setShowPaymentOptions(true)
                            }}
                          >
                            <Crown className="mr-2 h-4 w-4" />
                            {t("subscribeButton")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground pb-1">Choose how to pay for <span className="font-medium text-foreground">{email}</span>:</p>
                          <NowPaymentsButton
                            plan="gold-pro"
                            prefillEmail={email}
                            className="w-full bg-yellow-500 text-black hover:bg-yellow-600"
                          />
                          <OKXPayButton
                            plan="gold-pro"
                            prefillEmail={email}
                            className="w-full bg-transparent border border-yellow-500/30 text-foreground hover:bg-yellow-500/10"
                          />
                          <button
                            className="w-full pt-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPaymentOptions(false)}
                          >
                            ← Change email
                          </button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <AnalysisContent t={t} analysis={analysis} currency={currency} getPrice={getPrice} isPositive={isPositive} data={data} />
          )}
        </>
      )}
    </div>
  )
}

function AnalysisContent({ t, analysis, currency, getPrice, isPositive, data }: { t: any; analysis: ReturnType<typeof useAnalysis>; currency: string; getPrice: (usd: number, kwd: number) => string; isPositive: boolean; data: any }) {
  return (
    <div className="space-y-6">
      <Card className="border-yellow-500/20">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">{t("predictionTitle")}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("targetHigh")}</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">
                {currency === "USD" ? `$${analysis.predictedHigh.toLocaleString()}` : `${(analysis.predictedHigh * (data?.usdToKwd || 0.307)).toFixed(2)} KWD`}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("targetLow")}</p>
              <p className="mt-1 text-lg font-bold text-red-400">
                {currency === "USD" ? `$${analysis.predictedLow.toLocaleString()}` : `${(analysis.predictedLow * (data?.usdToKwd || 0.307)).toFixed(2)} KWD`}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("confidence")}</p>
              <p className="mt-1 text-lg font-bold text-yellow-500">{analysis.confidence}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/20">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">{t("analysisTitle")}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.analysis}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-500/20">
          <CardContent className="p-6">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-emerald-400">
              <Shield className="h-4 w-4" /> {t("supportTitle")}
            </h4>
            <div className="space-y-2">
              {analysis.support.map((level, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
                  <span className="text-xs text-muted-foreground">S{i + 1}</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {currency === "USD" ? `$${level.toLocaleString()}` : `${(level * (data?.usdToKwd || 0.307)).toFixed(2)} KWD`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-6">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-red-400">
              <Shield className="h-4 w-4" /> {t("resistanceTitle")}
            </h4>
            <div className="space-y-2">
              {analysis.resistance.map((level, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2">
                  <span className="text-xs text-muted-foreground">R{i + 1}</span>
                  <span className="font-mono text-sm font-bold text-red-400">
                    {currency === "USD" ? `$${level.toLocaleString()}` : `${(level * (data?.usdToKwd || 0.307)).toFixed(2)} KWD`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={analysis.recommendation === "BUY" ? "border-emerald-500/30 bg-emerald-500/5" : analysis.recommendation === "SELL" ? "border-red-500/30 bg-red-500/5" : "border-yellow-500/30 bg-yellow-500/5"}>
        <CardContent className="p-6 text-center">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">{t("buySellTitle")}</h4>
          <Badge className={`text-lg px-4 py-1 ${analysis.recommendation === "BUY" ? "bg-emerald-500 text-white" : analysis.recommendation === "SELL" ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}>
            {analysis.recommendation === "BUY" ? t("buySignal") : analysis.recommendation === "SELL" ? t("sellSignal") : t("bearish")}
          </Badge>
          <p className="mt-3 text-sm text-muted-foreground">{analysis.recommendationReason}</p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            {t("disclaimerText")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
