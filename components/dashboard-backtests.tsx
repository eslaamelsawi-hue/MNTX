"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusPill } from "@/components/status-pill"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { AreaChart, Area, XAxis, CartesianGrid } from "recharts"
import { LineChart, ArrowLeft, Eye, TrendingUp, TrendingDown, Percent, Activity } from "lucide-react"

type Trade = { date: string; direction: "buy" | "sell"; entry: string; exit: string; pnl: string; result: "win" | "loss" | "be" }
type BacktestSummary = {
  id: string; title: string; description: string | null; symbol: string; timeframe: string
  period_start: string | null; period_end: string | null
  win_rate: number | null; total_trades: number; profit_factor: number | null
  net_profit_pct: number | null; max_drawdown_pct: number | null
  cover_image_url: string | null; view_count: number; created_at: string
}
type Backtest = BacktestSummary & { trades: Trade[] }

const equityChartConfig = {
  equity: { label: "Cumulative return %", color: "hsl(var(--primary))" },
} satisfies ChartConfig

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className={`mt-1.5 font-mono text-xl font-bold tabular-nums ${tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-foreground"}`}>{value}</p>
    </div>
  )
}

function BacktestDetail({ id, email, onBack, l }: { id: string; email: string; onBack: () => void; l: Record<string, string> }) {
  const [bt, setBt] = useState<Backtest | null>(null)
  const [loading, setLoading] = useState(true)
  const [resultFilter, setResultFilter] = useState<"all" | "win" | "loss" | "be">("all")
  const [directionFilter, setDirectionFilter] = useState<"all" | "buy" | "sell">("all")
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    fetch(`/api/backtests/${id}`)
      .then((r) => r.json())
      .then((d) => setBt(d.backtest ?? null))
      .catch(() => setBt(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!email) return
    fetch(`/api/backtests/${id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_email: email }),
    }).catch(() => {})
    // one view per (backtest, client) — safe to fire once per detail open
  }, [id, email])

  const equityCurve = useMemo(() => {
    if (!bt) return []
    const sorted = [...bt.trades].sort((a, b) => a.date.localeCompare(b.date))
    let cumulative = 0
    return sorted.map((tr, i) => {
      cumulative += parseFloat(tr.pnl) || 0
      return { trade: `#${i + 1}`, equity: Math.round(cumulative * 100) / 100 }
    })
  }, [bt])

  const filteredTrades = useMemo(() => {
    if (!bt) return []
    let list = bt.trades
    if (resultFilter !== "all") list = list.filter((t) => t.result === resultFilter)
    if (directionFilter !== "all") list = list.filter((t) => t.direction === directionFilter)
    return [...list].sort((a, b) => (sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
  }, [bt, resultFilter, directionFilter, sortDesc])

  if (loading) return <p className="py-8 text-center text-sm text-muted-foreground">{l.loading || "Loading…"}</p>
  if (!bt) return <p className="py-8 text-center text-sm text-muted-foreground">{l.backtestNotFound || "Not found."}</p>

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {l.back || "Back"}
      </button>

      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">{bt.title}</h2>
          <StatusPill status="active" label={bt.symbol} />
          <span className="text-xs text-muted-foreground">{bt.timeframe}</span>
        </div>
        {bt.description && <p className="max-w-2xl text-sm text-muted-foreground">{bt.description}</p>}
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" /> {bt.view_count} {l.views || "views"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Percent className="h-3.5 w-3.5" />} label={l.winRate || "Win rate"} value={bt.win_rate != null ? `${bt.win_rate}%` : "-"} tone={bt.win_rate != null && bt.win_rate >= 50 ? "good" : undefined} />
        <StatTile icon={<Activity className="h-3.5 w-3.5" />} label={l.profitFactor || "Profit factor"} value={bt.profit_factor != null ? String(bt.profit_factor) : "-"} />
        <StatTile icon={<TrendingUp className="h-3.5 w-3.5" />} label={l.netProfit || "Net profit"} value={bt.net_profit_pct != null ? `${bt.net_profit_pct}%` : "-"} tone={bt.net_profit_pct != null ? (bt.net_profit_pct >= 0 ? "good" : "bad") : undefined} />
        <StatTile icon={<TrendingDown className="h-3.5 w-3.5" />} label={l.maxDrawdown || "Max drawdown"} value={bt.max_drawdown_pct != null ? `${bt.max_drawdown_pct}%` : "-"} tone={bt.max_drawdown_pct != null ? "bad" : undefined} />
      </div>

      {equityCurve.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{l.equityCurve || "Equity curve"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={equityChartConfig} className="aspect-auto h-56 w-full">
              <AreaChart data={equityCurve} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="trade" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="equity" type="monotone" fill="var(--color-equity)" fillOpacity={0.2} stroke="var(--color-equity)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {bt.trades.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base">{l.trades || "Trades"} ({filteredTrades.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as typeof resultFilter)}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l.allResults || "All results"}</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="be">B/E</SelectItem>
                </SelectContent>
              </Select>
              <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as typeof directionFilter)}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l.allDirections || "All directions"}</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSortDesc((d) => !d)}>
                {sortDesc ? (l.newestFirst || "Newest first") : (l.oldestFirst || "Oldest first")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredTrades.map((tr, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{tr.date}</span>
                  <span className="w-14 shrink-0 font-medium capitalize">{tr.direction}</span>
                  <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{tr.entry} → {tr.exit}</span>
                  <span className={`w-16 shrink-0 text-end font-mono font-semibold tabular-nums ${parseFloat(tr.pnl) > 0 ? "text-emerald-400" : parseFloat(tr.pnl) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                    {parseFloat(tr.pnl) > 0 ? "+" : ""}{tr.pnl}%
                  </span>
                  <StatusPill status={tr.result === "win" ? "active" : tr.result === "loss" ? "cancelled" : "inactive"} label={tr.result.toUpperCase()} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function DashboardBacktests({ email, l }: { email: string; l: Record<string, string> }) {
  const [backtests, setBacktests] = useState<BacktestSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/backtests")
      .then((r) => (r.ok ? r.json() : { backtests: [] }))
      .then((d) => setBacktests(d.backtests ?? []))
      .catch(() => setBacktests([]))
  }, [])

  if (selectedId) {
    return <BacktestDetail id={selectedId} email={email} onBack={() => setSelectedId(null)} l={l} />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LineChart className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{l.tabBacktests || "Strategy Backtests"}</h2>
          <p className="text-xs text-muted-foreground">{l.backtestsSubtitle || "Published backtest reports for our trading strategies."}</p>
        </div>
      </div>

      {backtests === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{l.loading || "Loading…"}</p>
      ) : backtests.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">{l.backtestsEmpty || "No backtest reports published yet."}</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {backtests.map((bt) => (
            <Card
              key={bt.id}
              className="cursor-pointer border-border bg-card transition-colors hover:border-primary/50"
              onClick={() => setSelectedId(bt.id)}
            >
              {bt.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bt.cover_image_url} alt="" className="h-32 w-full rounded-t-xl object-cover" />
              )}
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold text-foreground">{bt.title}</h3>
                  <span className="shrink-0 text-xs text-muted-foreground">{bt.timeframe}</span>
                </div>
                <p className="mb-3 font-mono text-xs text-muted-foreground">{bt.symbol}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">{l.winRate || "Win rate"}</p>
                    <p className="font-mono font-semibold tabular-nums text-foreground">{bt.win_rate != null ? `${bt.win_rate}%` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{l.netProfit || "Net profit"}</p>
                    <p className={`font-mono font-semibold tabular-nums ${(bt.net_profit_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {bt.net_profit_pct != null ? `${bt.net_profit_pct}%` : "-"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" /> {bt.view_count} {l.views || "views"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
