"use client"

import { Check, Lock } from "lucide-react"
import { OKXPayButton, WhopPayButton } from "@/components/payment-buttons"
import { InstapayPayButton } from "@/components/instapay-payment"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

export function CustomCheckout({
  name,
  email,
  telegram,
  sessions,
  focusAreas = [],
  price,
  code,
  split,
  methods = [],
  error,
}: {
  name?: string
  email?: string
  telegram?: string
  sessions?: number
  focusAreas?: string[]
  price?: number
  code?: string
  split?: { firstAmount: number; secondAmount: number } | null
  methods?: string[]
  error?: string
}) {
  const shell = (children: React.ReactNode) => (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} flex min-h-screen items-center justify-center bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto w-full max-w-xl px-4 py-16">{children}</div>
    </div>
  )

  if (error || !price || !sessions) {
    return shell(
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-bold">تعذر فتح صفحة الدفع</p>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "رابط الدفع غير صالح."}</p>
      </div>
    )
  }

  // The plan id carries the session count; the coupon brings the list price
  // down to what the admin agreed.
  const plan = `mentorship-custom-${sessions}`
  const payNow = split ? split.firstAmount : price

  return shell(
    <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Check className="h-4 w-4" /> تمت الموافقة على طلبك
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-balance md:text-3xl">
          {name ? `مرحبًا ${name}،` : "إتمام التسجيل"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          منتورشيب مخصص — {sessions} {sessions === 1 ? "جلسة فردية" : "جلسات فردية"} مباشرة.
        </p>
      </div>

      {focusAreas.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {focusAreas.map((f) => (
            <span key={f} className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="mt-7 text-center">
        <span className="text-4xl font-extrabold text-primary">{price}$</span>
      </div>

      {split ? (
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
          <p className="text-sm font-bold text-primary">الدفع على دفعتين</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            تدفع الآن <span className="font-bold text-foreground">{split.firstAmount}$</span>، والمتبقي{" "}
            <span className="font-bold text-foreground">{split.secondAmount}$</span> خلال 30 يومًا.
          </p>
        </div>
      ) : (
        <p className="mt-1 text-center text-xs text-muted-foreground">دفعة واحدة كاملة</p>
      )}

      <div className="mt-8 space-y-3">
        {methods.includes("visa") && (
          <WhopPayButton
            plan={plan}
            couponCode={code}
            prefillEmail={email}
            prefillTelegram={telegram}
            splitPayment={!!split}
            amount={payNow}
            className="w-full justify-center"
          />
        )}
        {methods.includes("okx") && (
          <OKXPayButton
            plan={plan}
            couponCode={code}
            prefillEmail={email}
            prefillTelegram={telegram}
            splitPayment={!!split}
            className="w-full justify-center"
          />
        )}
        {methods.includes("instapay") && (
          <InstapayPayButton
            plan={plan}
            couponCode={code}
            email={email}
            telegram={telegram}
            splitPayment={!!split}
            amountUsd={payNow}
            secondAmountUsd={split?.secondAmount}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50"
          />
        )}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> دفع آمن ومشفّر — جميع المدفوعات نهائية وغير قابلة للاسترداد
      </p>
    </div>
  )
}
