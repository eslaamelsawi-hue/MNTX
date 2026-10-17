"use client"

import { useEffect, useState } from "react"
import { Loader2, Check, Lock } from "lucide-react"
import { OKXPayButton, WhopPayButton } from "@/components/payment-buttons"
import { alexandria } from "@/lib/fonts"
import { MENTORSHIP_DISCOUNTED_PRICE } from "@/lib/plan-pricing"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

const PLAN = "coaching"
const ORIGINAL_PRICE = 999

export function MentorshipCheckout({ code, email }: { code?: string; email?: string }) {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [price, setPrice] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!code) {
      setChecking(false)
      setError("رابط الدفع غير مكتمل. تواصل معنا للحصول على رابط صحيح.")
      return
    }
    fetch("/api/validate-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, plan: PLAN }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) {
          setError(data.error === "This coupon has expired" ? "انتهت صلاحية رابط الدفع هذا." : data.error === "This coupon has reached its maximum uses" ? "تم استخدام رابط الدفع هذا بالفعل." : "رابط الدفع غير صالح.")
          return
        }
        setPrice(Math.round((ORIGINAL_PRICE * 100 - data.coupon.discountCents) / 100))
        setValid(true)
      })
      .catch(() => setError("تعذر التحقق من رابط الدفع. حاول مرة أخرى لاحقًا."))
      .finally(() => setChecking(false))
  }, [code])

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} flex min-h-screen items-center justify-center bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        {checking ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !valid ? (
          <div className="w-full rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-bold text-foreground">تعذر فتح صفحة الدفع</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Check className="h-4 w-4" /> تم قبولك في المينتورشيب
              </span>
              <h1 className="mt-5 text-2xl font-extrabold text-balance md:text-3xl">إتمام التسجيل في مينتورشيب Mentix الفردي</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                8 جلسات أسبوعية مباشرة، متابعة شخصية لصفقاتك وتفكيرك، ومجتمع خاص.
              </p>
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              <span className="text-lg text-muted-foreground line-through">{ORIGINAL_PRICE}$</span>
              <span className="text-4xl font-extrabold text-primary">{price ?? MENTORSHIP_DISCOUNTED_PRICE}$</span>
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">دفعة واحدة كاملة</p>

            <div className="mt-8 space-y-3">
              <WhopPayButton plan={PLAN} couponCode={code} prefillEmail={email} amount={price ?? MENTORSHIP_DISCOUNTED_PRICE} className="w-full justify-center" />
              <OKXPayButton plan={PLAN} couponCode={code} prefillEmail={email} className="w-full justify-center" />
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
