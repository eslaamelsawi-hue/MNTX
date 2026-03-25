"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Calculator, RefreshCw, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"

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

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatEGP(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatUSD(price: number): string {
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function IngotCalculator() {
  const t = useTranslations("ingotCalc")
  const [selectedKerat, setSelectedKerat] = useState(21)
  const [selectedWeight, setSelectedWeight] = useState(8)
  const [customWeight, setCustomWeight] = useState("")

  const { data, error, isLoading, mutate } = useSWR<GoldPriceData>("/api/gold", fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: false,
  })

  const standardWeights = [
    { grams: 2, label: t("quarterPound"), isPound: true },
    { grams: 4, label: t("halfPound"), isPound: true },
    { grams: 8, label: t("onePound"), isPound: true },
    { grams: 1, label: "1g", isPound: false },
    { grams: 2.5, label: "2.5g", isPound: false },
    { grams: 5, label: "5g", isPound: false },
    { grams: 10, label: "10g", isPound: false },
    { grams: 20, label: "20g", isPound: false },
    { grams: 31.1035, label: "1 oz", isPound: false },
    { grams: 50, label: "50g", isPound: false },
    { grams: 100, label: "100g", isPound: false },
    { grams: 500, label: "500g", isPound: false },
  ]

  const activeWeight = customWeight ? parseFloat(customWeight) || 0 : selectedWeight

  const calcResults = useMemo(() => {
    if (!data) return null
    const priceMap: Record<number, number | null> = {
      24: data.gram24,
      21: data.gram21,
      18: data.gram18,
    }
    const pricePerGram = priceMap[selectedKerat] ?? 0
    const totalEGP = pricePerGram * activeWeight
    const totalUSD = (data.usdToEgp ?? 0) > 0 ? totalEGP / data.usdToEgp! : 0
    const pricePerGramUSD = (data.usdToEgp ?? 0) > 0 ? pricePerGram / data.usdToEgp! : 0
    return { pricePerGram, pricePerGramUSD, totalEGP, totalUSD }
  }, [data, selectedKerat, activeWeight])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <Badge variant="outline" className="mb-4 border-yellow-500/30 text-yellow-500">
          <Calculator className="mr-1.5 h-3.5 w-3.5" />
          {t("gold")}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isLoading && (
        <Card className="border-yellow-500/20 animate-pulse">
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-9 w-20 rounded bg-muted" />)}
              </div>
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-8 w-16 rounded bg-muted" />)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && !isLoading && (
        <Card className="border-red-500/20">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-red-400 opacity-50" />
            <p className="font-medium text-foreground">Failed to load gold prices</p>
            <Button variant="outline" className="mt-4" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && !error && !isLoading && (
        <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-600/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Calculator className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("title")}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => mutate()} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Karat Selection */}
            <div>
              <Label className="mb-2 block text-sm font-medium">{t("selectKerat")}</Label>
              <div className="flex flex-wrap gap-2">
                {([24, 21, 18] as const).map((k) => (
                  <Button
                    key={k}
                    variant={selectedKerat === k ? "default" : "outline"}
                    className={
                      selectedKerat === k
                        ? "bg-yellow-500 text-black hover:bg-yellow-600"
                        : "border-yellow-500/30 hover:bg-yellow-500/10"
                    }
                    onClick={() => setSelectedKerat(k)}
                  >
                    {k}K {k === 24 ? t("pure") : ""}
                  </Button>
                ))}
              </div>
            </div>

            {/* Weight Selection */}
            <div>
              <Label className="mb-2 block text-sm font-medium">{t("selectWeight")}</Label>
              <div className="flex flex-wrap gap-2">
                {standardWeights.map((w) => (
                  <Button
                    key={w.label}
                    size="sm"
                    variant={selectedWeight === w.grams && !customWeight ? "default" : "outline"}
                    className={
                      selectedWeight === w.grams && !customWeight
                        ? w.isPound
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "bg-yellow-500 text-black hover:bg-yellow-600"
                        : "border-yellow-500/30 hover:bg-yellow-500/10"
                    }
                    onClick={() => {
                      setSelectedWeight(w.grams)
                      setCustomWeight("")
                      if (w.isPound) setSelectedKerat(21)
                    }}
                  >
                    {w.label}
                  </Button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder={t("customWeightPlaceholder")}
                  value={customWeight}
                  onChange={(e) => setCustomWeight(e.target.value)}
                  className="max-w-[200px] border-yellow-500/30 focus-visible:ring-yellow-500/50"
                />
                <span className="text-sm text-muted-foreground">g</span>
              </div>
            </div>

            {/* Results */}
            {calcResults && activeWeight > 0 && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("pricePerGram")}</p>
                    <p className="text-lg font-bold text-foreground">{formatEGP(calcResults.pricePerGram)} EGP</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("pricePerGramUSD")}</p>
                    <p className="text-lg font-bold text-foreground">{formatUSD(calcResults.pricePerGramUSD)}</p>
                  </div>
                </div>
                <div className="border-t border-yellow-500/20 pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("totalPriceEGP")} ({activeWeight}g)</p>
                    <p className="text-2xl font-bold text-yellow-500">{formatEGP(calcResults.totalEGP)} EGP</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("totalPriceUSD")}</p>
                    <p className="text-xl font-bold text-foreground">{formatUSD(calcResults.totalUSD)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison table — all 3 karats at selected weight */}
            {activeWeight > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium text-muted-foreground">{t("kerat")}</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("priceEGP")} ({activeWeight}g)</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">{t("priceUSD")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {([24, 21, 18] as const).map((k) => {
                      const priceMap: Record<number, number | null> = {
                        24: data.gram24,
                        21: data.gram21,
                        18: data.gram18,
                      }
                      const totalEGP = (priceMap[k] ?? 0) * activeWeight
                      const totalUSD = (data.usdToEgp ?? 0) > 0 ? totalEGP / data.usdToEgp! : 0
                      return (
                        <tr key={k} className={selectedKerat === k ? "bg-yellow-500/10" : ""}>
                          <td className="p-3 font-medium text-foreground">
                            {k}K {k === 24 ? t("pure") : ""}
                          </td>
                          <td className="p-3 text-right text-foreground">{formatEGP(totalEGP)} EGP</td>
                          <td className="p-3 text-right text-muted-foreground">{formatUSD(totalUSD)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}