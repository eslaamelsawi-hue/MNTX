"use client"

import { useEffect, useState } from "react"
import { Cake, Check, Gift, Loader2, Lock } from "lucide-react"
import { OKXPayButton, WhopPayButton } from "@/components/payment-buttons"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.18), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

const PLAN = "coaching"

const PERKS = [
  "جلسة فردية مباشرة كل أسبوع",
  "متابعة شخصية لصفقاتك وتفكيرك",
  "خطة مخصصة لإدارة المخاطر وتكبير حسابك",
  "عضوية المجتمع الخاص على ديسكورد",
]

type State =
  | { kind: "loading" }
  | { kind: "available"; listPrice: number; price: number; percent: number }
  | { kind: "claimed"; reason: string }

export function BirthdayOffer({ code }: { code: string }) {
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    fetch("/api/validate-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, plan: PLAN }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) {
          // A used-up or expired coupon is the offer closing itself — the
          // page needs no separate switch to turn off.
          setState({
            kind: "claimed",
            reason:
              data.error === "This coupon has reached its maximum uses"
                ? "الهدية اتاخدت بالفعل — كانت لشخص واحد بس."
                : data.error === "This coupon has expired"
                  ? "انتهت صلاحية العرض."
                  : "العرض ده مش متاح حاليًا.",
          })
          return
        }
        const cents = data.coupon.priceInCents as number
        const discount = data.coupon.discountCents as number
        setState({
          kind: "available",
          listPrice: Math.round(cents / 100),
          price: Math.round((cents - discount) / 100),
          percent: Math.round((discount / cents) * 100),
        })
      })
      .catch(() => setState({ kind: "claimed", reason: "تعذر تحميل العرض. حاول مرة أخرى بعد قليل." }))
  }, [code])

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} flex min-h-screen items-center justify-center bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        {state.kind === "loading" && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {state.kind === "claimed" && (
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold">العرض خلاص</h1>
            <p className="mt-3 text-muted-foreground">{state.reason}</p>
            <a
              href="/apply"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl border border-border px-6 text-base text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              قدّم على المينتورشيب
              <span aria-hidden="true">←</span>
            </a>
          </div>
        )}

        {state.kind === "available" && (
          <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-[0_0_90px_-20px_hsl(var(--primary)/0.3)] md:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Cake className="h-4 w-4" /> هدية عيد ميلادي
              </span>

              <h1 className="mt-5 text-3xl font-extrabold leading-tight text-balance md:text-4xl">
                عيد ميلادي… <span className="text-primary">والهدية ليك</span>
              </h1>

              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                خصم {state.percent}% على المينتورشيب الفردي 1-1 — متاح لشخص واحد بس، وأول
                حد يحجزه بيقفل العرض.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="text-xl text-muted-foreground line-through">{state.listPrice}$</span>
              <span className="text-5xl font-extrabold text-primary">{state.price}$</span>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">دفعة واحدة كاملة</p>

            <ul className="mx-auto mt-8 max-w-sm space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 space-y-3">
              <WhopPayButton plan={PLAN} couponCode={code} amount={state.price} className="w-full justify-center" />
              <OKXPayButton plan={PLAN} couponCode={code} className="w-full justify-center" />
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> دفع آمن ومشفّر
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
