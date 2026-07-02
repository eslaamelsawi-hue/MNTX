"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ToolHero,
  AboutSection,
  ChipGroup,
  NumberField,
  Metric,
  StatusPill,
  fmt,
  pct,
  type ChipOption,
} from "@/components/tools/tool-ui"

const RR_OPTIONS: ChipOption[] = [
  { value: 1, label: "1:1" },
  { value: 1.5, label: "1:1.5" },
  { value: 2, label: "1:2" },
  { value: 3, label: "1:3" },
]
const RISK_OPTIONS: ChipOption[] = [
  { value: 0.5, label: "0.5%" },
  { value: 1, label: "1%" },
  { value: 1.5, label: "1.5%" },
  { value: 2, label: "2%" },
  { value: 3, label: "3%" },
]
const TOTAL_OPTIONS: ChipOption[] = [
  { value: 20, label: "20" },
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
]

export function PerformanceAnalyzer() {
  const t = useTranslations("tools.performance")

  const [total, setTotal] = useState<number | string>(50)
  const [wins, setWins] = useState(28)
  const [losses, setLosses] = useState(22)
  const [rr, setRr] = useState<number | string>(2)
  const [risk, setRisk] = useState<number | string>(1)
  const [lossStreak, setLossStreak] = useState(5)
  const [winStreak, setWinStreak] = useState(7)
  const [currentDD, setCurrentDD] = useState<number | "">("")
  const [submitted, setSubmitted] = useState(false)

  const r = useMemo(() => {
    const RR = Number(rr) || 0
    const RISK = Number(risk) || 0
    const N = Number(total) || wins + losses
    const totalWL = wins + losses
    const winRate = totalWL > 0 ? (wins / totalWL) * 100 : 0
    const lossRate = 100 - winRate
    const expectancyR = (winRate / 100) * RR - lossRate / 100
    const expectedPerTradePct = expectancyR * RISK
    const expectedOverAllPct = expectedPerTradePct * N
    const profitFactor = losses > 0 ? (wins * RR) / losses : wins > 0 ? Infinity : 0
    const breakevenWR = (1 / (1 + RR)) * 100
    const streakRisk = (1 - Math.pow(1 - RISK / 100, lossStreak)) * 100

    let status: "strong" | "positive" | "marginal" | "negative"
    if (expectancyR <= 0) status = "negative"
    else if (expectancyR < 0.1) status = "marginal"
    else if (expectancyR < 0.3) status = "positive"
    else status = "strong"

    let note: string
    if (winRate < breakevenWR) note = "noteBelowBreakeven"
    else if (streakRisk > 18) note = "noteHighRisk"
    else note = "noteHealthy"

    return {
      N, winRate, expectancyR, expectedPerTradePct, expectedOverAllPct,
      profitFactor, breakevenWR, streakRisk, status, note,
    }
  }, [total, wins, losses, rr, risk, lossStreak, winStreak, currentDD])

  const statusLabel = {
    strong: t("statusStrong"),
    positive: t("statusPositive"),
    marginal: t("statusMarginal"),
    negative: t("statusNegative"),
  }[r.status]
  const statusTone = r.status === "negative" ? "bad" : r.status === "marginal" ? "warn" : "good"

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ToolHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} icon={BarChart3} />

      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <ChipGroup label={t("totalTrades")} options={TOTAL_OPTIONS} value={total} onChange={setTotal} />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label={t("winningTrades")} value={wins} onChange={setWins} />
            <NumberField label={t("losingTrades")} value={losses} onChange={setLosses} />
          </div>

          <ChipGroup label={t("avgRR")} options={RR_OPTIONS} value={rr} onChange={setRr} />
          <ChipGroup label={t("avgRisk")} options={RISK_OPTIONS} value={risk} onChange={setRisk} />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label={t("lossStreak")} value={lossStreak} onChange={setLossStreak} />
            <NumberField label={t("winStreak")} value={winStreak} onChange={setWinStreak} />
          </div>

          <div className="rounded-lg border border-border p-4">
            <NumberField
              label={t("currentDD")}
              value={currentDD}
              onChange={(n) => setCurrentDD(n)}
              placeholder={t("currentDDPlaceholder")}
              helper={t("currentDDHelper")}
            />
          </div>

          <Button size="lg" className="w-full gap-2" onClick={() => setSubmitted(true)}>
            <BarChart3 className="h-4 w-4" />
            {t("analyze")}
          </Button>
        </CardContent>
      </Card>

      {submitted && (
        <div className="mt-6 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">{t("resultTitle")}</h3>
                <StatusPill text={statusLabel} tone={statusTone} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Metric label={t("winRate")} value={pct(r.winRate)} accent="primary" />
                <Metric label={t("expectancyR")} value={`${r.expectancyR >= 0 ? "+" : ""}${fmt(r.expectancyR, 2)}R`} accent={r.expectancyR >= 0 ? "good" : "bad"} />
                <Metric label={t("expectedPerTrade")} value={`${r.expectedPerTradePct >= 0 ? "+" : ""}${pct(r.expectedPerTradePct, 2)}`} accent={r.expectedPerTradePct >= 0 ? "good" : "bad"} />
                <Metric label={t("profitFactor")} value={r.profitFactor === Infinity ? "∞" : fmt(r.profitFactor)} />
                <Metric label={t("breakevenWR")} value={pct(r.breakevenWR)} />
                <Metric label={t("expectedOverAll", { n: r.N })} value={`${r.expectedOverAllPct >= 0 ? "+" : ""}${pct(r.expectedOverAllPct)}`} accent={r.expectedOverAllPct >= 0 ? "good" : "bad"} />
                <Metric label={t("streakRisk", { n: lossStreak })} value={pct(r.streakRisk)} accent="bad" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-foreground">{t("assessment")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(r.note)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <AboutSection text={t("about")} />
    </div>
  )
}
