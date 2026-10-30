"use client"

import { useRef, useState } from "react"
import { TrendingUp } from "lucide-react"
import { CertificateCarousel } from "@/components/certificate-carousel"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")


type Answer = "yes" | "no"

/** The lead-in above the certificates is tailored to the answer, so the
 *  question isn't just decorative — but both paths land on the same proof. */
const LEAD_IN: Record<Answer, { eyebrow: string; line: string }> = {
  yes: {
    eyebrow: "ممتاز 👌",
    line: "إذن أنت تعرف أن الربح الحقيقي يأتي من الالتزام والانضباط، لا من الحظ. هذه نتائجي الموثّقة:",
  },
  no: {
    eyebrow: "مفيش مشكلة 💪",
    line: "كلنا بدأنا من هنا. الفرق الوحيد هو وجود نظام واضح وشخص يمشي معك خطوة بخطوة. هذه نتائجي الموثّقة:",
  },
}

export function ProfitableFunnel({ daysUntilBatch }: { daysUntilBatch: number }) {
  const [answer, setAnswer] = useState<Answer | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const choose = (value: Answer) => {
    setAnswer(value)
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const daysLabel =
    daysUntilBatch <= 0 ? "بدأت بالفعل"
      : daysUntilBatch === 1 ? "يوم واحد"
      : daysUntilBatch === 2 ? "يومين"
      : daysUntilBatch <= 10 ? `${daysUntilBatch} أيام`
      : `${daysUntilBatch} يومًا`

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} min-h-screen bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto w-[92%] max-w-4xl py-16 md:py-24">
        {/* 1 — the question */}
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <TrendingUp className="h-4 w-4" /> سؤال واحد بس
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-extrabold leading-tight text-balance md:text-5xl">
            هل أنت متداول <span className="text-primary">Profitable</span>؟
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            جاوب بصراحة — الإجابة مش هتتسجل في أي مكان، بس هتحدد الكلام اللي يستاهل تقراه بعدها.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {([
              { value: "yes" as const, label: "نعم، بحقق أرباح" },
              { value: "no" as const, label: "لسه لأ" },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
                className={`min-w-[170px] rounded-xl border-2 px-6 py-4 text-base font-bold transition-all ${
                  answer === option.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* 2 — the proof */}
        {answer && (
          <section ref={resultsRef} className="mt-16 scroll-mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <p className="text-sm font-bold text-primary">{LEAD_IN[answer].eyebrow}</p>
              <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                {LEAD_IN[answer].line}
              </p>
            </div>

            <div className="mt-8">
              <CertificateCarousel />
            </div>

            {/* 3 — the ask */}
            <div className="mt-14 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center md:p-10">
              <h2 className="text-3xl font-extrabold text-balance md:text-4xl">
                عايز توصل للمستوى ده؟
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                تقدر تسجّل في مينتورشيب دفعة أكتوبر — 6 أسابيع، جلسة فردية كل أسبوع، ومتابعة
                لصفقاتك خطوة بخطوة.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-5 py-2 text-sm font-bold text-primary">
                {daysUntilBatch > 0 ? <>تبدأ خلال {daysLabel}</> : <>الدفعة {daysLabel}</>}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/apply"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  قدّم على المينتورشيب
                  <span aria-hidden="true">←</span>
                </a>
                <a
                  href="/mentorship-features"
                  className="inline-flex h-12 items-center rounded-xl border border-border px-6 text-base text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  شوف كل المميزات
                </a>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                المقاعد محدودة، والتقديم يُغلق عند اكتمال العدد.
              </p>
            </div>
          </section>
        )}
      </div>

    </div>
  )
}
