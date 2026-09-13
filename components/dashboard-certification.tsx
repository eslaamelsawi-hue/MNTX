"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale } from "next-intl"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Award, TrendingUp, TrendingDown, Loader2, Lock, CheckCircle2, XCircle } from "lucide-react"

type Trade = {
  id: string
  instrument: string
  side: "buy" | "sell"
  units: number
  entry_price: number
  exit_price: number | null
  pnl: number | null
  unrealizedPnl: number | null
  status: "open" | "closed"
}

type Attempt = {
  id: string
  status: "trading" | "graded_passed" | "graded_failed"
  starting_balance: number
  started_at: string
  ends_at: string
  quiz_score_percent: number | null
  trading_pnl_percent: number | null
}

type QuizQuestion = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string }

export function DashboardCertification({ l }: { email: string; l: Record<string, string> }) {
  const locale = useLocale()
  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState(false)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [pnlPercent, setPnlPercent] = useState(0)
  const [equity, setEquity] = useState(0)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/certification/attempt")
      const data = await res.json()
      setEligible(!!data.eligible)
      setAttempt(data.attempt)
      setTrades(data.trades ?? [])
      setPnlPercent(data.pnlPercent ?? 0)
      setEquity(data.equity ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startTest = async () => {
    setStarting(true)
    try {
      const res = await fetch("/api/certification/start", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Failed to start test.")
        return
      }
      await load()
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!eligible) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="font-semibold text-foreground">{l.certNotEligibleTitle || "Certification test not available"}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {l.certNotEligibleDesc || "This test is only available to clients who've completed 1-on-1 coaching."}
        </p>
      </div>
    )
  }

  if (!attempt) {
    return <CertIntro l={l} onStart={startTest} starting={starting} />
  }

  if (attempt.status !== "trading") {
    return <CertResult attempt={attempt} l={l} onRestart={startTest} starting={starting} locale={locale} />
  }

  return <CertInProgress attempt={attempt} trades={trades} equity={equity} pnlPercent={pnlPercent} l={l} onRefresh={load} />
}

function CertIntro({ l, onStart, starting }: { l: Record<string, string>; onStart: () => void; starting: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> {l.certTitle || "Mentorship Certification Test"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {l.certIntroDesc || "Prove what you've learned and earn your certificate. The test has two parts, and you need to pass both:"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="font-semibold text-foreground">{l.certQuizPart || "1. Knowledge Quiz"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {l.certQuizPartDesc || "Multiple-choice questions on mentorship content. Pass at 75% or above."}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="font-semibold text-foreground">{l.certTradingPart || "2. 3-Week Trading Challenge"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {l.certTradingPartDesc || "Trade a $10,000 virtual account on live forex/index prices for 3 weeks. Pass at 5% profit or above."}
            </p>
          </div>
        </div>
        <Button onClick={onStart} disabled={starting} className="gap-1.5">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
          {l.certStartCta || "Start Test"}
        </Button>
      </CardContent>
    </Card>
  )
}

function CertResult({
  attempt, l, onRestart, starting, locale,
}: { attempt: Attempt; l: Record<string, string>; onRestart: () => void; starting: boolean; locale: string }) {
  const passed = attempt.status === "graded_passed"
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        {passed ? <CheckCircle2 className="h-14 w-14 text-emerald-500" /> : <XCircle className="h-14 w-14 text-red-500" />}
        <div>
          <p className="text-xl font-bold text-foreground">{passed ? (l.certPassedTitle || "You Passed!") : (l.certFailedTitle || "Not Passed Yet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {l.certQuizScoreLabel || "Quiz"}: {Math.round(attempt.quiz_score_percent ?? 0)}% · {l.certTradingScoreLabel || "Trading"}: {(attempt.trading_pnl_percent ?? 0).toFixed(1)}%
          </p>
        </div>
        {passed ? (
          <Link href={`/${locale}/certificate/${attempt.id}`} target="_blank">
            <Button className="gap-1.5"><Award className="h-4 w-4" /> {l.certViewCertificate || "View Certificate"}</Button>
          </Link>
        ) : (
          <Button onClick={onRestart} disabled={starting} variant="outline" className="gap-1.5">
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {l.certRetry || "Start New Attempt"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function CertInProgress({
  attempt, trades, equity, pnlPercent, l, onRefresh,
}: { attempt: Attempt; trades: Trade[]; equity: number; pnlPercent: number; l: Record<string, string>; onRefresh: () => Promise<void> }) {
  const endsAt = new Date(attempt.ends_at)
  const windowEnded = endsAt < new Date()
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div>
            <p className="text-xs text-muted-foreground">{l.certEquity || "Virtual Equity"}</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-foreground">${equity.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{l.certPnl || "P/L"}</p>
            <p className={`font-mono text-2xl font-bold tabular-nums ${pnlPercent >= 5 ? "text-emerald-400" : pnlPercent >= 0 ? "text-foreground" : "text-red-400"}`}>
              {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{l.certWindow || "Window"}</p>
            <p className="text-sm font-medium text-foreground">
              {windowEnded ? (l.certWindowEnded || "Ended") : `${daysLeft} ${l.certDaysLeft || "days left"}`}
            </p>
          </div>
          <Badge variant="outline" className="ms-auto">{l.certGoal || "Goal: 5% profit"}</Badge>
        </CardContent>
      </Card>

      {!windowEnded && <TradingPanel trades={trades} l={l} onChanged={onRefresh} />}
      {windowEnded && trades.some((t) => t.status === "open") && (
        <Card><CardContent className="py-4 text-sm text-muted-foreground">
          {l.certWindowEndedNote || "Your trading window has ended. Finalize the test below to close out any remaining open positions and get your result."}
        </CardContent></Card>
      )}

      <QuizPanel quizScorePercent={attempt.quiz_score_percent} l={l} onSubmitted={onRefresh} />

      {windowEnded && <FinalizeCard quizDone={attempt.quiz_score_percent != null} l={l} onFinalized={onRefresh} />}
    </div>
  )
}

function TradingPanel({ trades, l, onChanged }: { trades: Trade[]; l: Record<string, string>; onChanged: () => Promise<void> }) {
  const [prices, setPrices] = useState<Record<string, { bid: number; ask: number }>>({})
  const [instruments, setInstruments] = useState<Record<string, string>>({})
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [instrument, setInstrument] = useState("EUR_USD")
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [units, setUnits] = useState("1000")
  const [placing, setPlacing] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/certification/prices")
      const data = await res.json()
      if (res.ok) {
        setPrices(data.prices ?? {})
        setInstruments(data.instruments ?? {})
      }
    } finally {
      setLoadingPrices(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    const iv = setInterval(fetchPrices, 15000)
    return () => clearInterval(iv)
  }, [fetchPrices])

  const openPosition = async () => {
    setError("")
    const u = Number(units)
    if (!u || u <= 0) {
      setError(l.certUnitsError || "Enter a valid position size.")
      return
    }
    setPlacing(true)
    try {
      const res = await fetch("/api/certification/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument, side, units: u }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || l.certOpenFailed || "Failed to open position.")
        return
      }
      await onChanged()
      await fetchPrices()
    } finally {
      setPlacing(false)
    }
  }

  const closePosition = async (id: string) => {
    setClosingId(id)
    try {
      const res = await fetch(`/api/certification/trades/${id}`, { method: "PATCH" })
      const data = await res.json()
      if (!res.ok) alert(data.error || l.certCloseFailed || "Failed to close position.")
      await onChanged()
    } finally {
      setClosingId(null)
    }
  }

  const openTrades = trades.filter((t) => t.status === "open")
  const closedTrades = trades.filter((t) => t.status === "closed")
  const price = prices[instrument]

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{l.certTradingPanel || "Virtual Trading"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{l.certInstrument || "Instrument"}</label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(instruments).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{l.certSide || "Side"}</label>
            <Select value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">{l.certBuy || "Buy"}</SelectItem>
                <SelectItem value="sell">{l.certSell || "Sell"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{l.certUnits || "Units"}</label>
            <Input type="number" min="1" value={units} onChange={(e) => setUnits(e.target.value)} className="w-28" />
          </div>
          <div className="text-sm text-muted-foreground">
            {loadingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : price ? (
              <span className="font-mono">{l.certBid || "Bid"} {price.bid} / {l.certAsk || "Ask"} {price.ask}</span>
            ) : null}
          </div>
          <Button size="sm" onClick={openPosition} disabled={placing} className="gap-1.5">
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {l.certOpenPosition || "Open Position"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {openTrades.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{l.certOpenPositions || "Open Positions"}</p>
            <div className="space-y-2">
              {openTrades.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {t.side === "buy" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                    {instruments[t.instrument] || t.instrument} · {t.units} {l.certUnitsLabel || "units"} @ {t.entry_price}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`font-mono ${(t.unrealizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(t.unrealizedPnl ?? 0) >= 0 ? "+" : ""}{(t.unrealizedPnl ?? 0).toFixed(2)}
                    </span>
                    <Button size="sm" variant="outline" disabled={closingId === t.id} onClick={() => closePosition(t.id)}>
                      {closingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (l.certClose || "Close")}
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {closedTrades.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{l.certClosedPositions || "Closed Trades"}</p>
            <div className="space-y-1">
              {closedTrades.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>{instruments[t.instrument] || t.instrument} · {t.side} · {t.units}</span>
                  <span className={`font-mono ${(t.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(t.pnl ?? 0) >= 0 ? "+" : ""}{(t.pnl ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuizPanel({
  quizScorePercent, l, onSubmitted,
}: { quizScorePercent: number | null; l: Record<string, string>; onSubmitted: () => Promise<void> }) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ scorePercent: number; correct: number; total: number; passed: boolean } | null>(null)

  useEffect(() => {
    fetch("/api/certification/quiz").then((r) => r.json()).then((d) => setQuestions(d.questions ?? [])).catch(() => setQuestions([]))
  }, [])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/certification/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Failed to submit quiz.")
        return
      }
      setResult(data)
      await onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  if (questions === null) return null
  if (questions.length === 0) {
    return <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">{l.certNoQuiz || "The quiz hasn't been set up yet — check back soon."}</CardContent></Card>
  }

  const allAnswered = questions.every((q) => answers[q.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{l.certQuizTitle || "Knowledge Quiz"}</span>
          {quizScorePercent != null && (
            <Badge variant="outline" className={quizScorePercent >= 75 ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
              {Math.round(quizScorePercent)}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((q, i) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(["a", "b", "c", "d"] as const).map((k) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answers[q.id] === k ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} />
                  {q[`option_${k}` as keyof QuizQuestion] as string}
                </label>
              ))}
            </div>
          </div>
        ))}
        {result && (
          <p className={`text-sm font-medium ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
            {l.certQuizResult || "Score"}: {result.correct}/{result.total} ({result.scorePercent}%)
          </p>
        )}
        <Button onClick={submit} disabled={submitting || !allAnswered} className="gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {quizScorePercent != null ? (l.certRetakeQuiz || "Resubmit Answers") : (l.certSubmitQuiz || "Submit Quiz")}
        </Button>
      </CardContent>
    </Card>
  )
}

function FinalizeCard({
  quizDone, l, onFinalized,
}: { quizDone: boolean; l: Record<string, string>; onFinalized: () => Promise<void> }) {
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState("")

  const finalize = async () => {
    setFinalizing(true)
    setError("")
    try {
      const res = await fetch("/api/certification/finalize", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to finalize.")
        return
      }
      await onFinalized()
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          {quizDone
            ? (l.certReadyToFinalize || "Your 3-week window has ended — finalize your test to get your result.")
            : (l.certFinishQuizFirst || "Complete the quiz above before finalizing.")}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={finalize} disabled={finalizing || !quizDone} className="gap-1.5">
          {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
          {l.certFinalize || "Finalize Test"}
        </Button>
      </CardContent>
    </Card>
  )
}
