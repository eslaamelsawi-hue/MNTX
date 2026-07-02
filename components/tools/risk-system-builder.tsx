"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ToolHero,
  AboutSection,
  ChipGroup,
  NumberField,
  Metric,
  fmt,
  pct,
  money,
  type ChipOption,
} from "@/components/tools/tool-ui"

const MAXDD: ChipOption[] = [
  { value: 5, label: "5%" },
  { value: 8, label: "8%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
]
const TRADES_WEEK: ChipOption[] = [
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 6, label: "6" },
  { value: 10, label: "10" },
]
const WINRATE: ChipOption[] = [
  { value: 50, label: "50%" },
  { value: 55, label: "55%" },
  { value: 60, label: "60%" },
  { value: 65, label: "65%" },
]
const RR: ChipOption[] = [
  { value: 1, label: "1:1" },
  { value: 1.5, label: "1:1.5" },
  { value: 2, label: "1:2" },
  { value: 3, label: "1:3" },
]
const TOLERANCE: ChipOption[] = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
]

export function RiskSystemBuilder() {
  const t = useTranslations("tools.risk")
  const tc = useTranslations("tools.common")

  const [accountSize, setAccountSize] = useState(10000)
  const [accountType, setAccountType] = useState<number | string>("personal")
  const [maxDD, setMaxDD] = useState<number | string>(10)
  const [tradesWeek, setTradesWeek] = useState<number | string>(6)
  const [tradingDays, setTradingDays] = useState<number | string>(5)
  const [winRate, setWinRate] = useState<number | string>(55)
  const [rr, setRr] = useState<number | string>(2)
  const [tolerance, setTolerance] = useState<number | string>(3)
  const [submitted, setSubmitted] = useState(false)

  const typeOptions: ChipOption[] = [
    { value: "personal", label: t("typePersonal") },
    { value: "challenge", label: t("typeChallenge") },
    { value: "funded", label: t("typeFunded") },
    { value: "demo", label: t("typeDemo") },
  ]
  const daysOptions: ChipOption[] = [2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ${tc("days")}` }))

  const r = useMemo(() => {
    const DD = Number(maxDD) || 0
    const tol = Math.max(1, Number(tolerance) || 1)
    const days = Math.max(1, Number(tradingDays) || 1)
    const tpw = Number(tradesWeek) || 0
    const tradesPerDay = tpw / days

    // risk per trade so that `tol` consecutive losses reach the max drawdown
    const riskFrac = 1 - Math.pow(1 - DD / 100, 1 / tol)
    const riskPct = riskFrac * 100
    const riskMoney = accountSize * riskFrac

    const dailyPct = Math.min(riskPct * Math.min(Math.ceil(tradesPerDay), tol), DD)
    const weeklyPct = Math.min(dailyPct * days, DD)
    const monthlyPct = DD

    const wr = Number(winRate) / 100
    const expectancyR = wr * Number(rr) - (1 - wr)

    return {
      riskPct, riskMoney,
      dailyPct, dailyMoney: accountSize * (dailyPct / 100),
      weeklyPct, weeklyMoney: accountSize * (weeklyPct / 100),
      monthlyPct, monthlyMoney: accountSize * (monthlyPct / 100),
      expectancyR, tradesPerDay,
    }
  }, [accountSize, maxDD, tradesWeek, tradingDays, winRate, rr, tolerance])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ToolHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} icon={ShieldCheck} />

      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <NumberField label={t("accountSize")} value={accountSize} onChange={setAccountSize} />
          <ChipGroup label={t("accountType")} options={typeOptions} value={accountType} onChange={setAccountType} allowManual={false} />
          <ChipGroup label={t("maxDrawdown")} options={MAXDD} value={maxDD} onChange={setMaxDD} />
          <ChipGroup label={t("tradesPerWeek")} options={TRADES_WEEK} value={tradesWeek} onChange={setTradesWeek} />
          <ChipGroup label={t("tradingDays")} options={daysOptions} value={tradingDays} onChange={setTradingDays} allowManual={false} />
          <ChipGroup label={t("winRate")} options={WINRATE} value={winRate} onChange={setWinRate} />
          <ChipGroup label={t("avgRR")} options={RR} value={rr} onChange={setRr} />
          <ChipGroup label={t("lossTolerance")} options={TOLERANCE} value={tolerance} onChange={setTolerance} />

          <Button size="lg" className="w-full gap-2" onClick={() => setSubmitted(true)}>
            <ShieldCheck className="h-4 w-4" />
            {t("build")}
          </Button>
        </CardContent>
      </Card>

      {submitted && (
        <div className="mt-6 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <h3 className="mb-5 text-base font-semibold text-foreground">{t("resultTitle")}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Metric label={t("riskPerTrade")} value={pct(r.riskPct, 2)} accent="primary" />
                <Metric label={t("riskPerTradeMoney")} value={money(r.riskMoney)} />
                <Metric label={t("expectancy")} value={`${r.expectancyR >= 0 ? "+" : ""}${fmt(r.expectancyR, 2)}R`} accent={r.expectancyR >= 0 ? "good" : "bad"} />
                <Metric label={t("dailyLimit")} value={money(r.dailyMoney)} sub={pct(r.dailyPct)} accent="bad" />
                <Metric label={t("weeklyLimit")} value={money(r.weeklyMoney)} sub={pct(r.weeklyPct)} accent="bad" />
                <Metric label={t("monthlyLimit")} value={money(r.monthlyMoney)} sub={pct(r.monthlyPct)} accent="bad" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {r.expectancyR <= 0 ? t("expectancyNegative") : t("note")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <AboutSection text={t("about")} />
    </div>
  )
}
