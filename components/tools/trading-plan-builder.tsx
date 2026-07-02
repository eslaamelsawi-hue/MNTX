"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Target, Gauge, TrendingUp, Flag, Wallet, AlertTriangle, FileText, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ToolHero,
  AboutSection,
  ChipGroup,
  NumberField,
  SwitchField,
  Metric,
  StatusPill,
  fmt,
  pct,
  money,
  type ChipOption,
} from "@/components/tools/tool-ui"

const WEEKS_PER_MONTH = 4.345

const TRADES_WEEK: ChipOption[] = [
  { value: 2, label: "2" }, { value: 4, label: "4" }, { value: 6, label: "6" }, { value: 8, label: "8" }, { value: 10, label: "10" },
]
const WINRATE: ChipOption[] = [
  { value: 50, label: "50%" }, { value: 55, label: "55%" }, { value: 60, label: "60%" }, { value: 65, label: "65%" },
]
const RR: ChipOption[] = [
  { value: 1, label: "1:1" }, { value: 1.5, label: "1:1.5" }, { value: 2, label: "1:2" }, { value: 3, label: "1:3" },
]
const MAXDD: ChipOption[] = [
  { value: 5, label: "5%" }, { value: 8, label: "8%" }, { value: 10, label: "10%" }, { value: 15, label: "15%" },
]

/** Solve for the monthly rate (fraction) that grows `current` to `target` over
 *  `months`, with a fixed monthly `deposit` added each month. */
function solveGrowth(current: number, target: number, months: number, deposit: number) {
  const fv = (g: number) =>
    g === 0 ? current + deposit * months : current * Math.pow(1 + g, months) + deposit * ((Math.pow(1 + g, months) - 1) / g)
  if (fv(0) >= target) return 0
  let lo = 0, hi = 1
  if (fv(hi) < target) return hi
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (fv(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function TradingPlanBuilder() {
  const t = useTranslations("tools.plan")
  const tc = useTranslations("tools.common")

  const [current, setCurrent] = useState(5000)
  const [target, setTarget] = useState(10000)
  const [duration, setDuration] = useState<number | string>(6)
  const [tradesWeek, setTradesWeek] = useState<number | string>(6)
  const [winRate, setWinRate] = useState<number | string>(55)
  const [rr, setRr] = useState<number | string>(2)
  const [maxDD, setMaxDD] = useState<number | string>(10)
  const [tradingDays, setTradingDays] = useState<number | string>(5)
  const [futureDeposits, setFutureDeposits] = useState(false)
  const [monthlyDeposit, setMonthlyDeposit] = useState(500)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  const durationOptions: ChipOption[] = [3, 6, 12, 24].map((n) => ({ value: n, label: `${n} ${tc("monthsUnit")}` }))
  const daysOptions: ChipOption[] = [2, 3, 4, 5].map((n) => ({ value: n, label: `${n} ${tc("days")}` }))

  const r = useMemo(() => {
    const months = Math.max(1, Number(duration) || 1)
    const ratio = current > 0 ? target / current : 0
    const totalGrowth = (ratio - 1) * 100
    const monthlyGrowth = ratio > 0 ? (Math.pow(ratio, 1 / months) - 1) * 100 : 0
    const weeks = months * WEEKS_PER_MONTH
    const weeklyGrowth = ratio > 0 ? (Math.pow(ratio, 1 / weeks) - 1) * 100 : 0
    const totalTrades = (Number(tradesWeek) || 0) * weeks
    const perTradeReturn = ratio > 0 && totalTrades > 0 ? (Math.pow(ratio, 1 / totalTrades) - 1) * 100 : 0

    const wr = Number(winRate) / 100
    const expectancyR = wr * Number(rr) - (1 - wr)
    const tradesPerMonth = (Number(tradesWeek) || 0) * WEEKS_PER_MONTH
    const edgeMonthly = tradesPerMonth * 1 * expectancyR // expected monthly % at 1% risk / trade
    const recommendedRisk = expectancyR > 0 ? Math.min(50, Math.max(0.1, perTradeReturn / expectancyR)) : 0

    let feasibility: "realistic" | "ambitious" | "unrealistic"
    if (expectancyR <= 0 || edgeMonthly <= 0) feasibility = "unrealistic"
    else if (monthlyGrowth <= edgeMonthly) feasibility = "realistic"
    else if (monthlyGrowth <= edgeMonthly * 2) feasibility = "ambitious"
    else feasibility = "unrealistic"

    // pressure score 0-100
    let pressure: number
    if (edgeMonthly <= 0) pressure = 99
    else pressure = Math.max(1, Math.min(99, Math.round((monthlyGrowth / edgeMonthly) * 55)))
    const pressureLevel = pressure >= 70 ? "high" : pressure >= 40 ? "moderate" : "low"

    // monthly progression (up to 12 rows, always ending at the final month)
    const rows = Math.min(months, 12)
    const progression = Array.from({ length: rows }, (_, i) => {
      const m = Math.round((months * (i + 1)) / rows)
      const bal = current * Math.pow(1 + monthlyGrowth / 100, m)
      return { month: m, balance: bal, cumGrowth: current > 0 ? (bal / current - 1) * 100 : 0, final: m >= months }
    })

    // round-number milestones (5 steps current -> target)
    const stepRaw = (target - current) / 5
    const milestones = Array.from({ length: 5 }, (_, i) => {
      const amount = Math.round((current + stepRaw * (i + 1)) / 100) * 100
      const eta = monthlyGrowth > 0 && amount > current ? Math.log(amount / current) / Math.log(1 + monthlyGrowth / 100) : 0
      return { amount: i === 4 ? target : amount, eta: Math.max(1, Math.ceil(eta)), goal: i === 4 }
    })

    // deposit-adjusted required growth
    const adjustedMonthly = futureDeposits && monthlyDeposit > 0 ? solveGrowth(current, target, months, monthlyDeposit) * 100 : null

    // alerts
    const alerts: { key: string; vars?: Record<string, string | number> }[] = []
    if (expectancyR <= 0) alerts.push({ key: "alertNegativeEdge" })
    if (monthlyGrowth > 15) alerts.push({ key: "alertHighPressure", vars: { g: fmt(monthlyGrowth, 1) } })
    if (recommendedRisk > 2.5) alerts.push({ key: "alertHighRisk", vars: { r: fmt(recommendedRisk, 1) } })

    return {
      months, totalGrowth, monthlyGrowth, weeklyGrowth, perTradeReturn, edgeMonthly, recommendedRisk,
      feasibility, pressure, pressureLevel, progression, milestones, adjustedMonthly, alerts, expectancyR,
    }
  }, [current, target, duration, tradesWeek, winRate, rr, maxDD, futureDeposits, monthlyDeposit])

  const feasLabel = { realistic: t("feasRealistic"), ambitious: t("feasAmbitious"), unrealistic: t("feasUnrealistic") }[r.feasibility]
  const feasTone = r.feasibility === "realistic" ? "good" : r.feasibility === "ambitious" ? "warn" : "bad"
  const feasNote = { realistic: t("noteRealistic"), ambitious: t("noteAmbitious"), unrealistic: t("noteUnrealistic") }[r.feasibility]

  const pressureLabel = { low: t("pressureLow"), moderate: t("pressureModerate"), high: t("pressureHigh") }[r.pressureLevel]
  const pressureNote = { low: t("pressureNoteLow"), moderate: t("pressureNoteModerate"), high: t("pressureNoteHigh") }[r.pressureLevel]
  const pressureColor = r.pressureLevel === "high" ? "bg-red-500" : r.pressureLevel === "moderate" ? "bg-yellow-500" : "bg-green-500"
  const pressureText = r.pressureLevel === "high" ? "text-red-400" : r.pressureLevel === "moderate" ? "text-yellow-300" : "text-green-400"

  const rrLabel = RR.find((o) => o.value === rr)?.label ?? `1:${rr}`
  const actionPlan = [
    t("actionTitle"),
    "",
    `${t("lblCurrent")}: ${money(current)}`,
    `${t("lblTarget")}: ${money(target)}`,
    `${t("lblDuration")}: ${r.months} ${t("lblMonths")}`,
    `${t("lblTradesWeek")}: ${tradesWeek}`,
    `${t("lblWinRate")}: ${winRate}%`,
    `${t("lblRR")}: ${rrLabel}`,
    `${t("lblRisk")}: ${fmt(r.recommendedRisk, 1)}%`,
    `${t("lblMaxDD")}: ${maxDD}%`,
    "",
    `${t("monthlyGrowth")}: +${fmt(r.monthlyGrowth, 2)}%`,
    `${t("weeklyGrowth")}: +${fmt(r.weeklyGrowth, 2)}%`,
    "",
    t("actionGuide"),
  ].join("\n")

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(actionPlan)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ToolHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} icon={Target} />

      {/* ---------- FORM ---------- */}
      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label={t("currentCapital")} value={current} onChange={setCurrent} />
            <NumberField label={t("targetCapital")} value={target} onChange={setTarget} />
          </div>
          <ChipGroup label={t("duration")} options={durationOptions} value={duration} onChange={setDuration} />
          <ChipGroup label={t("tradesPerWeek")} options={TRADES_WEEK} value={tradesWeek} onChange={setTradesWeek} />
          <ChipGroup label={t("winRate")} options={WINRATE} value={winRate} onChange={setWinRate} />
          <ChipGroup label={t("avgRR")} options={RR} value={rr} onChange={setRr} />
          <ChipGroup label={t("maxDrawdown")} options={MAXDD} value={maxDD} onChange={setMaxDD} />
          <ChipGroup label={t("tradingDays")} options={daysOptions} value={tradingDays} onChange={setTradingDays} allowManual={false} />
          <SwitchField label={t("futureDeposits")} checked={futureDeposits} onChange={setFutureDeposits} />
          {futureDeposits && (
            <NumberField label={t("monthlyDeposit")} value={monthlyDeposit} onChange={setMonthlyDeposit} step={50} />
          )}

          <Button size="lg" className="w-full gap-2" onClick={() => setSubmitted(true)}>
            <Target className="h-4 w-4" />
            {t("build")}
          </Button>
        </CardContent>
      </Card>

      {submitted && (
        <div className="mt-6 space-y-6">
          {/* ---------- 1. GOAL ACHIEVEMENT ---------- */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  {t("goalSection")}
                </h3>
                <StatusPill text={feasLabel} tone={feasTone} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Metric label={t("monthlyGrowth")} value={`+${pct(r.monthlyGrowth)}`} accent="primary" />
                <Metric label={t("totalGrowth")} value={`+${pct(r.totalGrowth)}`} />
                <Metric label={t("weeklyGrowth")} value={`+${pct(r.weeklyGrowth)}`} />
                <Metric label={t("riskPerTrade")} value={pct(r.recommendedRisk)} accent={r.recommendedRisk > 2.5 ? "bad" : undefined} />
                <Metric label={t("perTradeReturn")} value={`+${pct(r.perTradeReturn, 2)}`} />
                <Metric label={t("edgeReturn")} value={`${r.edgeMonthly >= 0 ? "+" : ""}${pct(r.edgeMonthly)}`} accent={r.edgeMonthly >= 0 ? "good" : "bad"} />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{feasNote}</p>
            </CardContent>
          </Card>

          {/* ---------- 2. PLAN PRESSURE ---------- */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-primary" />
                  {t("pressureSection")}
                </h3>
                <StatusPill text={pressureLabel} tone={r.pressureLevel === "high" ? "bad" : r.pressureLevel === "moderate" ? "warn" : "good"} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">/ 100</span>
                <span className={`text-4xl font-bold ${pressureText}`}>{r.pressure}</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${pressureColor}`} style={{ width: `${r.pressure}%` }} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{pressureNote}</p>
            </CardContent>
          </Card>

          {/* ---------- 3. MONTHLY PROGRESSION ---------- */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t("progressionSection")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-primary/30" />
                <div className="h-1.5 flex-1 rounded-full bg-primary/60" />
                <div className="h-1.5 flex-1 rounded-full bg-primary" />
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-start font-medium text-muted-foreground">{t("colMonth")}</th>
                      <th className="p-3 text-center font-medium text-muted-foreground">{t("colTarget")}</th>
                      <th className="p-3 text-end font-medium text-muted-foreground">{t("colGrowth")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {r.progression.map((p) => (
                      <tr key={p.month} className={p.final ? "bg-green-500/10" : ""}>
                        <td className="p-3 font-medium text-foreground">{t("milestoneMonth", { n: p.month })}</td>
                        <td className={`p-3 text-center font-semibold ${p.final ? "text-green-400" : "text-foreground"}`}>{money(p.balance)}</td>
                        <td className={`p-3 text-end ${p.final ? "text-green-400 font-semibold" : "text-primary"}`}>+{fmt(p.cumGrowth, 1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ---------- 4. MILESTONES ---------- */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Flag className="h-4 w-4 text-primary" />
                {t("milestonesSection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {r.milestones.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border p-3.5 ${
                    m.goal ? "border-green-500/40 bg-green-500/10" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                      m.goal ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
                    }`}>
                      {m.goal ? <Flag className="h-4 w-4" /> : i + 1}
                    </div>
                    <div>
                      <p className={`font-semibold ${m.goal ? "text-green-400" : "text-foreground"}`}>{money(m.amount)}</p>
                      <p className="text-xs text-muted-foreground">{t("milestoneReach")}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {m.goal ? t("goalBadge") : t("milestoneMonth", { n: m.eta })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ---------- 5. DEPOSITS ---------- */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-primary" />
                {t("depositsSection")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{t("futureDepositsQ")}</p>
                  <p className="mt-1 font-semibold text-foreground">{futureDeposits ? t("yesDeposits") : t("noDeposits")}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{t("monthlyDeposit")}</p>
                  <p className="mt-1 font-semibold text-foreground">{futureDeposits ? money(monthlyDeposit) : money(0)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {futureDeposits && r.adjustedMonthly != null
                  ? t("depositNoteOn", { amount: money(monthlyDeposit), g: fmt(r.adjustedMonthly, 1) })
                  : t("depositNoteOff")}
              </p>
            </CardContent>
          </Card>

          {/* ---------- 6. ALERTS ---------- */}
          {r.alerts.length > 0 ? (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-base text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  {t("alertsSection")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {r.alerts.map((a) => (
                    <li key={a.key} className="flex items-start gap-2.5 text-sm text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                      {t(a.key, a.vars)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="flex items-start gap-2.5 p-5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                {t("alertOk")}
              </CardContent>
            </Card>
          )}

          {/* ---------- 7. FULL ACTION PLAN ---------- */}
          <Card className="border-border bg-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                {t("actionPlanSection")}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={copyPlan}>
                {copied ? <><Check className="mr-1.5 h-4 w-4 text-green-400" /> {t("copied")}</> : <><Copy className="mr-1.5 h-4 w-4" /> {t("copy")}</>}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
                {actionPlan}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      <AboutSection text={t("about")} />
    </div>
  )
}
