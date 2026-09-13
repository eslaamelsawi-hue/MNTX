import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOandaPrices } from "@/lib/oanda"
import { createNotification } from "@/lib/notifications"

export const STARTING_BALANCE = 10000
export const TEST_DURATION_DAYS = 21
export const QUIZ_PASS_PERCENT = 75
export const PROFIT_PASS_PERCENT = 5

export type VirtualTrade = {
  id: string
  attempt_id: string
  instrument: string
  side: "buy" | "sell"
  units: number
  entry_price: number
  exit_price: number | null
  opened_at: string
  closed_at: string | null
  pnl: number | null
  status: "open" | "closed"
}

/** Has this email ever held a coaching-plan subscription (any status)? */
export async function isEligibleForCertTest(email: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("client_email", email.toLowerCase().trim())
    .eq("plan", "coaching")
    .limit(1)
    .maybeSingle()
  return !!data
}

/** Realized P/L from closed trades + mark-to-market unrealized P/L from open
 *  trades (using live OANDA prices), plus the resulting equity and % return
 *  against the attempt's starting balance. */
export async function computeEquity(
  startingBalance: number,
  trades: VirtualTrade[]
): Promise<{ equity: number; pnlPercent: number; unrealizedByTradeId: Record<string, number> }> {
  const realized = trades.filter((t) => t.status === "closed").reduce((sum, t) => sum + (t.pnl ?? 0), 0)

  const openTrades = trades.filter((t) => t.status === "open")
  const unrealizedByTradeId: Record<string, number> = {}
  let unrealized = 0

  if (openTrades.length > 0) {
    try {
      const instruments = Array.from(new Set(openTrades.map((t) => t.instrument)))
      const prices = await getOandaPrices(instruments)
      for (const t of openTrades) {
        const p = prices[t.instrument]
        if (!p) continue
        const markPrice = t.side === "buy" ? p.bid : p.ask
        const pnl = t.side === "buy" ? (markPrice - t.entry_price) * t.units : (t.entry_price - markPrice) * t.units
        unrealizedByTradeId[t.id] = pnl
        unrealized += pnl
      }
    } catch (e) {
      console.error("[certification] failed to mark open trades to market:", e)
    }
  }

  const equity = startingBalance + realized + unrealized
  const pnlPercent = ((equity - startingBalance) / startingBalance) * 100
  return { equity, pnlPercent, unrealizedByTradeId }
}

type FinalizeResult = { ok: true; attempt: Record<string, unknown> } | { ok: false; error: string; status: number }

/**
 * Closes out remaining open positions at the current price, computes final
 * P/L%, and grades pass/fail against both required thresholds. Shared by
 * the client's own "Finalize" action and the admin's force-finalize action.
 */
export async function finalizeAttempt(attemptId: string): Promise<FinalizeResult> {
  const admin = createAdminClient()
  const { data: attempt } = await admin.from("cert_test_attempts").select("*").eq("id", attemptId).single()
  if (!attempt) return { ok: false, error: "Attempt not found", status: 404 }
  if (attempt.status !== "trading") return { ok: false, error: "This attempt has already been finalized", status: 400 }
  if (new Date(attempt.ends_at) > new Date()) {
    return { ok: false, error: "The 3-week trading window hasn't ended yet", status: 400 }
  }
  if (attempt.quiz_score_percent === null || attempt.quiz_score_percent === undefined) {
    return { ok: false, error: "The quiz hasn't been completed yet", status: 400 }
  }

  const { data: trades } = await admin.from("cert_virtual_trades").select("*").eq("attempt_id", attempt.id)
  const openTrades = (trades ?? []).filter((t) => t.status === "open")
  if (openTrades.length > 0) {
    const { unrealizedByTradeId } = await computeEquity(attempt.starting_balance, trades ?? [])
    for (const t of openTrades) {
      const pnl = unrealizedByTradeId[t.id]
      if (pnl === undefined) continue
      await admin.from("cert_virtual_trades").update({ closed_at: new Date().toISOString(), pnl, status: "closed" }).eq("id", t.id)
    }
  }

  const { data: finalTrades } = await admin.from("cert_virtual_trades").select("*").eq("attempt_id", attempt.id)
  if ((finalTrades ?? []).some((t) => t.status === "open")) {
    return { ok: false, error: "Couldn't get a live price for an open position — try again shortly", status: 502 }
  }

  const { pnlPercent } = await computeEquity(attempt.starting_balance, finalTrades ?? [])
  const quizPassed = attempt.quiz_score_percent >= QUIZ_PASS_PERCENT
  const tradingPassed = pnlPercent >= PROFIT_PASS_PERCENT
  const passed = quizPassed && tradingPassed

  const { data: updated, error } = await admin
    .from("cert_test_attempts")
    .update({
      status: passed ? "graded_passed" : "graded_failed",
      trading_pnl_percent: pnlPercent,
      passed,
      finalized_at: new Date().toISOString(),
    })
    .eq("id", attempt.id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message, status: 500 }

  await createNotification({
    clientEmail: attempt.client_email,
    title: passed ? "Certification Test Passed!" : "Certification Test Result",
    message: passed
      ? `Congratulations — you passed the mentorship certification test with a ${Math.round(attempt.quiz_score_percent)}% quiz score and ${pnlPercent.toFixed(1)}% trading return. Your certificate is ready.`
      : `Your certification test result: ${Math.round(attempt.quiz_score_percent)}% quiz score (need ${QUIZ_PASS_PERCENT}%), ${pnlPercent.toFixed(1)}% trading return (need ${PROFIT_PASS_PERCENT}%). You can start a new attempt anytime.`,
    type: "system",
    link: "certification",
    sendEmail: true,
  })

  return { ok: true, attempt: updated }
}
