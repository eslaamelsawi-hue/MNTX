"use client"

import { useState, useEffect, useMemo } from "react"
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
  Info,
  Calculator,
  FileText,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslations, useLocale } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

interface GoldArticle {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  published: boolean
  created_at: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function toEN(v: number | string): string {
  return String(v).replace(/[\u0660-\u0669]/g, (d) =>
    String("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d))
  )
}

function formatEGP(price: number | null): string {
  if (price === null) return "--"
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatUSD(price: number | null): string {
  if (price === null) return "--"
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function GoldCardSkeleton() {
  return (
    <Card className="border-border bg-card animate-pulse">
      <CardContent className="p-6">
        <div className="h-4 w-24 rounded bg-secondary mb-3" />
        <div className="h-8 w-40 rounded bg-secondary mb-2" />
        <div className="h-3 w-20 rounded bg-secondary" />
      </CardContent>
    </Card>
  )
}

export function GoldPage() {
  const t = useTranslations("gold")
  const tc = useTranslations("ingotCalc")
  const locale = useLocale()

  const { data: articlesData } = useSWR<{ articles: GoldArticle[] }>(
    "/api/gold/articles",
    fetcher,
    { revalidateOnFocus: false }
  )
  const articles = articlesData?.articles ?? []
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)
  const { data, error, isLoading, mutate } = useSWR<GoldPriceData>(
    "/api/gold",
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: true,
    }
  )

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

  const isPositive = (data?.change24h ?? 0) >= 0

  // Ingot Calculator State
  const [selectedKerat, setSelectedKerat] = useState(24)
  const [selectedWeight, setSelectedWeight] = useState(1)
  const [customWeight, setCustomWeight] = useState("")

  const standardWeights = [
    { grams: 2, label: tc("quarterPound"), isPound: true },
    { grams: 4, label: tc("halfPound"), isPound: true },
    { grams: 8, label: tc("onePound"), isPound: true },
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
    const priceMap: Record<number, number | null> = { 24: data.gram24, 21: data.gram21, 18: data.gram18 }
    const pricePerGram = priceMap[selectedKerat] ?? 0
    const totalEGP = pricePerGram * activeWeight
    const totalUSD = (data.usdToEgp ?? 0) > 0 ? totalEGP / data.usdToEgp! : 0
    const pricePerGramUSD = (data.usdToEgp ?? 0) > 0 ? pricePerGram / data.usdToEgp! : 0
    return { pricePerGram, pricePerGramUSD, totalEGP, totalUSD }
  }, [data, selectedKerat, activeWeight])


  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <Badge variant="outline" className="mb-4 border-yellow-500/30 text-yellow-500">
          <Coins className="mr-1.5 h-3.5 w-3.5" />
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

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <GoldCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-400 opacity-50" />
          <p className="text-lg font-medium text-foreground">{t("errorTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("errorDescription")}</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("retry")}
          </Button>
        </div>
      )}

      {data && !error && !isLoading && (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-center gap-6 rounded-xl border border-border bg-card p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("ounceUSD")}</p>
              <p className="mt-1 font-bold text-foreground">{formatUSD(data.ounceUSD)}</p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("exchangeRate")}</p>
              <p className="mt-1 font-bold text-foreground">
                {data.usdToEgp ? `1 USD = ${toEN(data.usdToEgp.toFixed(2))} EGP` : "--"}
              </p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("change24h")}</p>
              <p className={`mt-1 font-bold flex items-center justify-center gap-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {data.change24h !== null ? `${toEN(Math.abs(data.change24h).toFixed(2))}%` : "--"}
              </p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Button variant="ghost" size="sm" onClick={() => mutate()} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("refresh")}
            </Button>
          </div>

          {/* ========== Ingot Calculator ========== */}
          <Card className="mb-8 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-600/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Calculator className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tc("title")}</CardTitle>
                  <p className="text-sm text-muted-foreground">{tc("subtitle")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kerat Selection */}
              <div>
                <Label className="mb-2 block text-sm font-medium">{tc("selectKerat")}</Label>
                <div className="flex flex-wrap gap-2">
                  {([24, 21, 18]).map((k) => (
                    <Button
                      key={k}
                      variant={selectedKerat === k ? "default" : "outline"}
                      className={selectedKerat === k ? "bg-yellow-500 text-black hover:bg-yellow-600" : "border-yellow-500/30 hover:bg-yellow-500/10"}
                      onClick={() => setSelectedKerat(k)}
                    >
                      {k}K {k === 24 ? tc("pure") : ""}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Weight Selection */}
              <div>
                <Label className="mb-2 block text-sm font-medium">{tc("selectWeight")}</Label>
                <div className="flex flex-wrap gap-2">
                  {standardWeights.map((w) => (
                    <Button
                      key={w.label}
                      size="sm"
                      variant={selectedWeight === w.grams && !customWeight ? "default" : "outline"}
                      className={selectedWeight === w.grams && !customWeight
                        ? w.isPound ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-yellow-500 text-black hover:bg-yellow-600"
                        : "border-yellow-500/30 hover:bg-yellow-500/10"}
                      onClick={() => { setSelectedWeight(w.grams); setCustomWeight(""); if (w.isPound) setSelectedKerat(21); }}
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
                    placeholder={tc("customWeightPlaceholder")}
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    className="max-w-[200px] border-yellow-500/30 focus-visible:ring-yellow-500/50"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
              </div>

              {/* Results */}
              {calcResults && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{tc("pricePerGram")}</p>
                      <p className="text-lg font-bold text-foreground">{formatEGP(calcResults.pricePerGram)} EGP</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tc("pricePerGramUSD")}</p>
                      <p className="text-lg font-bold text-foreground">{formatUSD(calcResults.pricePerGramUSD)}</p>
                    </div>
                  </div>
                  <div className="border-t border-yellow-500/20 pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{tc("totalPriceEGP")} ({activeWeight}g)</p>
                      <p className="text-2xl font-bold text-yellow-500">{formatEGP(calcResults.totalEGP)} EGP</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tc("totalPriceUSD")}</p>
                      <p className="text-xl font-bold text-foreground">{formatUSD(calcResults.totalUSD)}</p>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-yellow-600/10 transition-all duration-200 hover:border-yellow-500/40 sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Scale className="h-5 w-5 text-yellow-500" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("ouncePrice")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("inEGP")}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatEGP(data.ounceEGP)} <span className="text-sm text-muted-foreground">EGP</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("inUSD")}</p>
                    <p className="text-lg font-semibold text-foreground">{formatUSD(data.ounceUSD)}</p>
                  </div>
                  {data.change24h !== null && (
                    <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {isPositive ? "+" : ""}{toEN(data.change24h.toFixed(2))}% {t("today")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20 bg-card transition-all duration-200 hover:border-yellow-500/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                      <Coins className="h-5 w-5 text-yellow-500" />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("gram24Title")}</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 text-xs">99.9%</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-foreground">
                    {formatEGP(data.gram24)} <span className="text-sm text-muted-foreground">EGP</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t("perGram")}</p>
                  <div className="rounded-lg bg-secondary/50 p-3 mt-3">
                    <p className="text-xs text-muted-foreground">{t("purity")}</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-yellow-500" style={{ width: "100%" }} />
                    </div>
                    <p className="mt-1 text-xs text-yellow-500 text-right">100%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20 bg-card transition-all duration-200 hover:border-yellow-500/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                      <Coins className="h-5 w-5 text-yellow-400" />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t("gram21Title")}</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-yellow-400/30 text-yellow-400 text-xs">87.5%</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-foreground">
                    {formatEGP(data.gram21)} <span className="text-sm text-muted-foreground">EGP</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t("perGram")}</p>
                  <div className="rounded-lg bg-secondary/50 p-3 mt-3">
                    <p className="text-xs text-muted-foreground">{t("purity")}</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-yellow-400" style={{ width: "87.5%" }} />
                    </div>
                    <p className="mt-1 text-xs text-yellow-400 text-right">87.5%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                {t("comparisonTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("tableType")}</th>
                      <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("tablePurity")}</th>
                      <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t("tablePriceEGP")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{t("ounceLabel")}</td>
                      <td className="py-3 px-4 text-muted-foreground">24K (99.9%)</td>
                      <td className="py-3 px-4 text-end font-bold text-foreground">{formatEGP(data.ounceEGP)} <span className="text-xs text-muted-foreground">EGP</span></td>
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{t("gram24Label")}</td>
                      <td className="py-3 px-4 text-muted-foreground">24K (99.9%)</td>
                      <td className="py-3 px-4 text-end font-bold text-foreground">{formatEGP(data.gram24)} <span className="text-xs text-muted-foreground">EGP</span></td>
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{t("gram21Label")}</td>
                      <td className="py-3 px-4 text-muted-foreground">21K (87.5%)</td>
                      <td className="py-3 px-4 text-end font-bold text-foreground">{formatEGP(data.gram21)} <span className="text-xs text-muted-foreground">EGP</span></td>
                    </tr>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{t("gram18Label")}</td>
                      <td className="py-3 px-4 text-muted-foreground">18K (75%)</td>
                      <td className="py-3 px-4 text-end font-bold text-foreground">{formatEGP(data.gram18)} <span className="text-xs text-muted-foreground">EGP</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-card transition-all duration-200 hover:border-yellow-500/40 mb-8">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Coins className="h-5 w-5 text-yellow-300" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("gram18Title")}</CardTitle>
                </div>
                <Badge variant="outline" className="border-yellow-300/30 text-yellow-300 text-xs">75%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-8">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {formatEGP(data.gram18)} <span className="text-sm text-muted-foreground">EGP</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t("perGram")}</p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">{t("purity")}</p>
                    <div className="mt-1 h-2 w-full rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-yellow-300" style={{ width: "75%" }} />
                    </div>
                    <p className="mt-1 text-xs text-yellow-300 text-right">75%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== Gold Analysis Articles ========== */}
          {articles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10">
                  <FileText className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t("articlesTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("articlesSubtitle")}</p>
                </div>
              </div>
              <div className="space-y-4">
                {articles.map((article) => {
                  const title = locale === "ar" ? (article.title_ar || article.title_en) : article.title_en
                  const content = locale === "ar" ? (article.content_ar || article.content_en) : article.content_en
                  const isExpanded = expandedArticle === article.id
                  return (
                    <Card
                      key={article.id}
                      className="border-yellow-500/20 bg-card transition-all duration-200 hover:border-yellow-500/40 cursor-pointer"
                      onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(article.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? "" : "line-clamp-3"
                        }`}>
                          {content}
                        </div>
                        <button
                          className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 font-medium"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedArticle(isExpanded ? null : article.id)
                          }}
                        >
                          {isExpanded ? t("readLess") : t("readMore")}
                        </button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-secondary/30 p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              <div>
                <h3 className="font-bold text-foreground">{t("disclaimerTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t("disclaimerText")}</p>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  )
}