"use client"

import { useState } from "react"
import { Calendar, Clock } from "lucide-react"
import { OKXPayButton, NowPaymentsButton, WhopPayButton } from "@/components/payment-buttons"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

const DURATIONS = [
  { hours: 1, price: 100, plan: "consultation-1h" },
  { hours: 2, price: 180, plan: "consultation-2h" },
  { hours: 3, price: 260, plan: "consultation-3h" },
  { hours: 4, price: 340, plan: "consultation-4h" },
  { hours: 5, price: 420, plan: "consultation-5h" },
]

export function ConsultationBooking() {
  const [selected, setSelected] = useState(DURATIONS[0])

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} min-h-screen bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Calendar className="h-4 w-4" /> استشارة فردية مدفوعة
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-balance md:text-5xl">
            احجز <span className="text-primary">استشارتك</span> مع Mentix
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            جلسة فردية مباشرة لمناقشة حسابك، خطتك، أو أي استفسار يخص التداول — اختر المدة التي تناسبك
            وسيتواصل معك فريقنا لتحديد الموعد بعد الدفع مباشرة.
          </p>
        </section>

        <section className="mx-auto mt-12 rounded-3xl border border-border bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-10">
          <h2 className="text-center text-lg font-bold text-foreground">اختر مدة الاستشارة</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            {DURATIONS.map((d) => (
              <button
                key={d.hours}
                type="button"
                onClick={() => setSelected(d)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 transition-colors ${
                  selected.hours === d.hours
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <Clock className="h-3.5 w-3.5" /> {d.hours === 1 ? "ساعة واحدة" : `${d.hours} ساعات`}
                </span>
                <span className="text-lg font-extrabold">{d.price}$</span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            100$ للساعة الأولى، و80$ لكل ساعة إضافية.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">المجموع:</span>
            <span className="text-3xl font-extrabold text-primary">{selected.price}$</span>
          </div>

          <div className="mt-6 space-y-3">
            <WhopPayButton plan={selected.plan} className="w-full justify-center" />
            <OKXPayButton plan={selected.plan} className="w-full justify-center" />
            <NowPaymentsButton plan={selected.plan} className="w-full justify-center" />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            بعد إتمام الدفع، سيتواصل معك فريقنا عبر البريد الإلكتروني لتحديد الموعد المناسب لمدة استشارتك كاملة.
          </p>
        </section>
      </div>
    </div>
  )
}
