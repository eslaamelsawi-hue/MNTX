"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ToolHero,
  AboutSection,
  ChipGroup,
  NumberField,
  SegToggle,
  Metric,
  fmt,
  pct,
  money,
  type ChipOption,
} from "@/components/tools/tool-ui"

const RISK_OPTIONS: ChipOption[] = [
  { value: 0.25, label: "0.25%" },
  { value: 0.5, label: "0.5%" },
  { value: 1, label: "1%" },
  { value: 2, label: "2%" },
  { value: 3, label: "3%" },
]
const TRADES_MONTH: ChipOption[] = [
  { value: 8, label: "8" },
  { value: 15, label: "15" },
  { value: 25, label: "25" },
  { value: 40, label: "40" },
]
const MONTHLY_PERF: ChipOption[] = [
  { value: 3, label: "3%" },
  { value: 5, label: "5%" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
]
const WINRATE_OPTIONS: ChipOption[] = [
  { value: 45, label: "45%" },
  { value: 50, label: "50%" },
  { value: 55, label: "55%" },
  { value: 60, label: "60%" },
]
const RR_OPTIONS: ChipOption[] = [
  { value: 1, label: "1:1" },
  { value: 1.5, label: "1:1.5" },
  { value: 2, label: "1:2" },
  { value: 3, label: "1:3" },
]
const DD_ROWS = [5, 10, 20, 30, 40, 50, 60, 70]

export function RecoveryEngine() {
  const t = useTranslations("tools.recovery")

  const [high, setHigh] = useState(12000)
  const [current, setCurrent] = useState(9500)
  const [risk, setRisk] = useState<number | string>(1)
  const [tradesMonth, setTradesMonth] = useState<number | string>(15)
  const [method, setMethod] = useState<number | string>("monthly")
  const [monthlyPerf, setMonthlyPerf] = useState<number | string>(5)
  const [winRate, setWinRate] = useState<number | string>(50)
  const [rr, setRr] = useState<number | string>(2)
  const [submitted, setSubmitted] = useState(false)

  const r = useMemo(() => {
    const loss = high - current
    const inDrawdown = loss > 0
    const currentDD = high > 0 ? (loss / high) * 100 : 0
    const gainNeeded = current > 0 ? (loss / current) * 100 : 0

    let monthlyReturn: number
    if (method === "monthly") {
      monthlyReturn = Number(monthlyPerf) || 0
    } else {
      const wr = Number(winRate) / 100
      const expectancyR = wr * Number(rr) - (1 - wr)
      monthlyReturn = (Number(tradesMonth) || 0) * (Number(risk) || 0) * expectancyR
    }
    let months: number | null = null
    if (inDrawdown && monthlyReturn > 0 && current > 0) {
      months = Math.log(high / current) / Math.log(1 + monthlyReturn / 100)
    }
    return { loss, inDrawdown, currentDD, gainNeeded, monthlyReturn, months }
  }, [high, current, risk, tradesMonth, method, monthlyPerf, winRate, rr])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ToolHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} icon={Activity} />

      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label={t("highestBalance")} value={high} onChange={setHigh} />
            <NumberField label={t("currentBalance")} value={current} onChange={setCurrent} />
          </div>

          <ChipGroup label={t("avgRisk")} options={RISK_OPTIONS} value={risk} onChange={setRisk} />
          <ChipGroup label={t("tradesPerMonth")} options={TRADES_MONTH} value={tradesMonth} onChange={setTradesMonth} />

          <SegToggle
            label={t("method")}
            options={[
              { value: "monthly", label: t("methodMonthly") },
              { value: "trade", label: t("methodTrade") },
            ]}
            value={method}
            onChange={setMethod}
          />

          {method === "monthly" ? (
            <ChipGroup label={t("monthlyPerf")} options={MONTHLY_PERF} value={monthlyPerf} onChange={setMonthlyPerf} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <ChipGroup label={t("winRate")} options={WINRATE_OPTIONS} value={winRate} onChange={setWinRate} />
              <ChipGroup label={t("avgRR")} options={RR_OPTIONS} value={rr} onChange={setRr} />
            </div>
          )}

          <Button size="lg" className="w-full gap-2" onClick={() => setSubmitted(true)}>
            <Activity className="h-4 w-4" />
            {t("analyze")}
          </Button>
        </CardContent>
      </Card>

      {submitted && (
        <Card className={`mt-6 ${r.inDrawdown ? "border-red-500/25 bg-red-500/5" : "border-green-500/25 bg-green-500/5"}`}>
          <CardContent className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-3">
            <Metric
              label={t("currentDrawdown")}
              value={r.inDrawdown ? `-${pct(r.currentDD)}` : "0%"}
              sub={r.inDrawdown ? t("belowHigh", { amount: money(r.loss) }) : t("atHigh")}
              accent={r.inDrawdown ? "bad" : "good"}
            />
            <Metric
              label={t("gainNeeded")}
              value={r.inDrawdown ? `+${pct(r.gainNeeded)}` : "—"}
              accent="primary"
            />
            <Metric
              label={t("estRecovery")}
              value={r.months && r.months > 0 ? t("monthsValue", { n: Math.ceil(r.months) }) : r.inDrawdown ? t("notRecoverable") : "—"}
            />
            <div className="sm:col-span-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {r.monthlyReturn <= 0 && r.inDrawdown ? t("warnNegative") : t("planHealthy")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery reference table — always visible */}
      <Card className="mt-6 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">{t("tableTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-start font-medium text-muted-foreground">{t("colDrawdown")}</th>
                  <th className="p-3 text-end font-medium text-muted-foreground">{t("colGain")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DD_ROWS.map((dd) => {
                  const gain = (dd / (100 - dd)) * 100
                  const near = r.inDrawdown && Math.abs(dd - r.currentDD) < 5
                  const color = dd >= 40 ? "text-red-400" : dd >= 20 ? "text-orange-400" : "text-foreground"
                  return (
                    <tr key={dd} className={near ? "bg-primary/10" : ""}>
                      <td className={`p-3 font-medium ${dd >= 40 ? "text-red-400" : dd >= 20 ? "text-orange-400" : "text-foreground"}`}>-{dd}%</td>
                      <td className={`p-3 text-end font-semibold ${color}`}>+{fmt(gain, 1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AboutSection text={t("about")} />
    </div>
  )
}
