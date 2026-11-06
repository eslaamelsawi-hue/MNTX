"use client"

import { useMemo, useState } from "react"
import { Check, Minus, Plus, Sparkles, Lock } from "lucide-react"
import { OKXPayButton, WhopPayButton } from "@/components/payment-buttons"
import { InstapayPayButton } from "@/components/instapay-payment"
import {
  CUSTOM_MENTORSHIP_BASE,
  CUSTOM_MENTORSHIP_MAX_SESSIONS,
  customMentorshipPrice,
  customMentorshipSessionsPrice,
} from "@/lib/plan-pricing"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

/** What the base covers no matter how the plan is built. */
const INCLUDED = [
  "خطة تداول مكتوبة ومفصّلة على أسلوبك",
  "مراجعة حسابك وصفقاتك السابقة",
  "متابعة مباشرة على تيليجرام طوال فترة المنتورشيب",
  "تسجيلات كل الجلسات تبقى معك",
]

const FOCUS_AREAS = [
  "السيولة و Smart Money Concepts",
  "بناء وتنفيذ خطة التداول",
  "إدارة رأس المال والمخاطر",
  "سيكولوجية التداول والانضباط",
  "اجتياز تحديات شركات التمويل",
  "تحليل الذهب والعملات",
  "بناء نظام تداول خاص بك",
  "مراجعة صفقات وتصحيح الأخطاء",
]

const LEVELS = ["مبتدئ تمامًا", "لدي أساسيات", "أتداول بالفعل", "متداول ممول"]

export function CustomizeMentorship() {
  const [sessions, setSessions] = useState(3)
  const [focus, setFocus] = useState<string[]>([])
  const [level, setLevel] = useState(LEVELS[1])
  const [goals, setGoals] = useState("")
  const [email, setEmail] = useState("")
  const [telegram, setTelegram] = useState("")
  const [saved, setSaved] = useState(false)

  const sessionsPrice = customMentorshipSessionsPrice(sessions)
  const total = customMentorshipPrice(sessions)
  const perSession = useMemo(() => Math.round(sessionsPrice / sessions), [sessionsPrice, sessions])
  const plan = `mentorship-custom-${sessions}`
  const ready = email.includes("@")

  const toggleFocus = (item: string) =>
    setFocus((f) => (f.includes(item) ? f.filter((x) => x !== item) : [...f, item]))

  /** Sends the brief with the order so the mentor knows what was bought
   *  before the first session. Never blocks the payment itself. */
  const saveBrief = () => {
    if (!ready || saved) return
    setSaved(true)
    fetch("/api/mentorship-customization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, telegram, sessions, total, focus, level, goals }),
    }).catch(() => setSaved(false))
  }

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} min-h-screen bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-14 md:py-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> منتورشيب على مقاسك
          </span>
          <h1 className="mt-5 text-3xl font-extrabold text-balance md:text-4xl">صمّم المنتورشيب الخاص بك</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            اختر عدد الجلسات التي تحتاجها فعلًا، وحدّد ما تريد التركيز عليه. تدفع مقابل ما تختاره فقط.
          </p>
        </div>

        {/* sessions */}
        <section className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-bold">عدد الجلسات</h2>
            <span className="text-xs text-muted-foreground">جلسة = ساعة مباشرة 1-1</span>
          </div>

          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setSessions((n) => Math.max(1, n - 1))}
              disabled={sessions <= 1}
              aria-label="إنقاص عدد الجلسات"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-primary/50 disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="text-5xl font-extrabold tabular-nums text-primary">{sessions}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {sessions === 1 ? "جلسة" : sessions === 2 ? "جلستان" : "جلسات"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSessions((n) => Math.min(CUSTOM_MENTORSHIP_MAX_SESSIONS, n + 1))}
              disabled={sessions >= CUSTOM_MENTORSHIP_MAX_SESSIONS}
              aria-label="زيادة عدد الجلسات"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-primary/50 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {Array.from({ length: CUSTOM_MENTORSHIP_MAX_SESSIONS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSessions(n)}
                className={`h-9 w-9 rounded-xl border text-sm font-bold tabular-nums transition-colors ${
                  n === sessions
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {sessions >= 4 && (
            <p className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-center text-xs font-medium text-primary">
              من 4 جلسات فأكثر: 70$ للجلسة الواحدة — أوفر سعر للساعة
            </p>
          )}
        </section>

        {/* focus */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-lg font-bold">على ماذا تريد التركيز؟</h2>
          <p className="mt-1 text-xs text-muted-foreground">اختر ما يناسبك — تُبنى الجلسات حول اختياراتك.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {FOCUS_AREAS.map((item) => {
              const on = focus.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleFocus(item)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                    on
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {item}
                </button>
              )
            })}
          </div>

          <h3 className="mt-7 text-sm font-bold">مستواك الحالي</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                  l === level
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <h3 className="mt-7 text-sm font-bold">ما الذي تريد الوصول إليه؟</h3>
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="مثال: عايز أجتاز تحدي شركة تمويل وأثبت على نظام واحد بدل ما أغيّر كل أسبوع."
            className="mt-3 w-full rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50"
          />
        </section>

        {/* what's always included */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-lg font-bold">يشمل دائمًا</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* price + checkout */}
        <section className="mt-6 rounded-3xl border border-primary/30 bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.25)] md:p-8">
          <h2 className="text-lg font-bold">ملخص خطتك</h2>

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">الأساس (الخطة والمتابعة)</dt>
              <dd className="font-bold tabular-nums">{CUSTOM_MENTORSHIP_BASE}$</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                {sessions} {sessions === 1 ? "جلسة" : "جلسات"}
                <span className="ms-1.5 text-xs">(~{perSession}$ للجلسة)</span>
              </dt>
              <dd className="font-bold tabular-nums">{sessionsPrice}$</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <dt className="font-bold">الإجمالي</dt>
              <dd className="text-3xl font-extrabold tabular-nums text-primary">{total}$</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-3">
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary/50"
            />
            <input
              type="text"
              dir="ltr"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@تيليجرام (اختياري)"
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary/50"
            />
          </div>

          {!ready ? (
            <p className="mt-5 rounded-xl border border-border bg-background p-4 text-center text-sm text-muted-foreground">
              أدخل بريدك الإلكتروني لعرض طرق الدفع
            </p>
          ) : (
            <div className="mt-5 space-y-3" onClick={saveBrief}>
              <WhopPayButton
                plan={plan}
                prefillEmail={email}
                prefillTelegram={telegram || undefined}
                amount={total}
                className="w-full justify-center"
              />
              <OKXPayButton
                plan={plan}
                prefillEmail={email}
                prefillTelegram={telegram || undefined}
                className="w-full justify-center"
              />
              <InstapayPayButton
                plan={plan}
                email={email}
                telegram={telegram || undefined}
                amountUsd={total}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50"
              />
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> دفع آمن ومشفّر — جميع المدفوعات نهائية وغير قابلة للاسترداد
          </p>
        </section>
      </div>
    </div>
  )
}
