"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Pause, Play, TrendingUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CERTIFICATES } from "@/lib/certificates"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

const FLIP_MS = 320
const AUTOPLAY_MS = 4200

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
  const [index, setIndex] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Rotates the card edge-on, swaps the image while it's invisible, then
   *  rotates it back — reads as the certificate flipping to the next one. */
  const goTo = useCallback((next: number) => {
    setFlipping((already) => {
      if (already) return already
      if (flipTimer.current) clearTimeout(flipTimer.current)
      flipTimer.current = setTimeout(() => {
        setIndex(((next % CERTIFICATES.length) + CERTIFICATES.length) % CERTIFICATES.length)
        setFlipping(false)
      }, FLIP_MS)
      return true
    })
  }, [])

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => () => { if (flipTimer.current) clearTimeout(flipTimer.current) }, [])

  useEffect(() => {
    if (!answer || !playing || lightbox) return
    const timer = setTimeout(next, AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [answer, playing, lightbox, next, index])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false)
      if (e.key === "ArrowLeft") next()
      if (e.key === "ArrowRight") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox, next, prev])

  const choose = (value: Answer) => {
    setAnswer(value)
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  const cert = CERTIFICATES[index]
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

            <div className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-6">
              {/* flip stage */}
              <div className="relative" style={{ perspective: "1600px" }}>
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  aria-label="تكبير الشهادة"
                  className="block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-background"
                  style={{
                    transform: flipping ? "rotateY(90deg)" : "rotateY(0deg)",
                    opacity: flipping ? 0.25 : 1,
                    transition: `transform ${FLIP_MS}ms cubic-bezier(.4,0,.2,1), opacity ${FLIP_MS}ms ease`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
                    <Image
                      src={cert.src}
                      alt={cert.alt}
                      fill
                      sizes="(max-width: 768px) 92vw, 760px"
                      className="object-contain p-2"
                      priority={index === 0}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={prev}
                  aria-label="السابق"
                  className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="التالي"
                  className="absolute start-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 min-h-[2.5rem] text-center text-sm leading-relaxed text-muted-foreground" dir="ltr">
                {cert.alt}
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "إيقاف العرض" : "تشغيل العرض"}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {CERTIFICATES.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`الشهادة ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? "w-6 bg-primary" : "w-1.5 bg-muted hover:bg-primary/40"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {index + 1}/{CERTIFICATES.length}
                </span>
              </div>
            </div>

            {/* 3 — the ask */}
            <div className="mt-14 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center md:p-10">
              <h2 className="text-3xl font-extrabold text-balance md:text-4xl">
                عايز توصل للمستوى ده؟
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                تقدر تسجّل في مينتورشيب دفعة أكتوبر — 8 أسابيع، جلسة فردية كل أسبوع، ومتابعة
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

      {/* lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="إغلاق"
            className="absolute end-4 top-4 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={cert.src} alt={cert.alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
