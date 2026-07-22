"use client"

import { useState, useCallback } from "react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OKXPayButton, NowPaymentsButton } from "@/components/payment-buttons"
import { EgyptPayment } from "@/components/egypt-payment"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { startCheckoutSession } from "@/app/actions/stripe"
import {
  CreditCard,
  Loader2,
  Tag,
  X,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import type { Product } from "@/lib/products"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

const translations = {
  en: {
    selectPlan: "Select a Plan",
    orderSummary: "Order Summary",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    couponPlaceholder: "Enter coupon code",
    applyCoupon: "Apply",
    removeCoupon: "Remove",
    invalidCoupon: "Invalid coupon code",
    couponApplied: "Coupon applied!",
    choosePayment: "Choose Payment Method",
    payWithStripe: "Pay with Card (Stripe)",
    payWithOKX: "Pay with OKX (USDT)",
    payWithCrypto: "Pay with Crypto",
    egyptPayment: "Egypt Local Payment",
    secureCheckout: "Secure Checkout",
    emailLabel: "Email for confirmation",
    emailPlaceholder: "your@email.com",
    telegramLabel: "Telegram username",
    telegramPlaceholder: "@username",
    telegramRequired: "Please enter your Telegram username above to continue.",
    features: "What's included",
    perMonth: "/month",
    oneTime: "One-time payment",
    back: "Back to plans",
    processing: "Processing...",
  },
  ar: {
    selectPlan: "اختر خطة",
    orderSummary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    total: "الإجمالي",
    couponPlaceholder: "أدخل كود الخصم",
    applyCoupon: "تطبيق",
    removeCoupon: "إزالة",
    invalidCoupon: "كود الخصم غير صالح",
    couponApplied: "تم تطبيق الخصم!",
    choosePayment: "اختر طريقة الدفع",
    payWithStripe: "الدفع بالبطاقة (Stripe)",
    payWithOKX: "الدفع عبر OKX (USDT)",
    payWithCrypto: "الدفع بالعملات الرقمية",
    egyptPayment: "الدفع المحلي - مصر",
    secureCheckout: "دفع آمن",
    emailLabel: "البريد الإلكتروني للتأكيد",
    emailPlaceholder: "بريدك@الإلكتروني.com",
    telegramLabel: "اسم مستخدم تيليجرام",
    telegramPlaceholder: "@username",
    telegramRequired: "من فضلك أدخل اسم مستخدم تيليجرام بالأعلى للمتابعة.",
    features: "ماذا يشمل",
    perMonth: "/شهر",
    oneTime: "دفعة واحدة",
    back: "العودة للخطط",
    processing: "جاري المعالجة...",
  },
}

type AppliedCoupon = {
  code: string
  discount_type: "percent" | "fixed"
  discount_value: number
  discountCents: number
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    "Full SMC Course (20+ lessons)",
    "Private Discord community",
    "Group Zoom session",
    "Lifetime access",
  ],
  coaching: [
    "Full courses (MNTX Theory)",
    "50+ video lessons",
    "Funded account challenge strategy",
    "Discord & Telegram communities",
    "Weekly 1-on-1 Zoom sessions (4 months — 10 sessions)",
    "Trading playbook & templates",
    "Lifetime access",
  ],
  "extend-1m": ["1 month mentorship extension", "Weekly Zoom sessions", "Discord & Telegram access"],
  "extend-2m": ["2 months mentorship extension", "Weekly Zoom sessions", "Discord & Telegram access"],
  "extend-3m": ["3 months mentorship extension", "Weekly Zoom sessions", "Discord & Telegram access"],
  "extend-6m": ["6 months mentorship extension", "Weekly Zoom sessions", "Discord & Telegram access", "Best value"],
  "gold-pro": ["Monthly gold price analysis", "Professional market insights"],
  test: ["Test plan for payment verification"],
}

export default function UnifiedCheckout({ products, initialPlan }: { products: Product[]; initialPlan?: string }) {
  const locale = useLocale()
  const t = translations[locale as keyof typeof translations] || translations.en

  const validInitialPlan = initialPlan && products.some((p) => p.id === initialPlan) ? initialPlan : null
  const [selectedPlan, setSelectedPlan] = useState<string | null>(validInitialPlan)
  const [email, setEmail] = useState("")
  const [telegram, setTelegram] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [showEgypt, setShowEgypt] = useState(false)

  const selectedProduct = products.find((p) => p.id === selectedPlan)

  const subtotalCents = selectedProduct?.priceInCents ?? 0
  const discountCents = appliedCoupon?.discountCents ?? 0
  const totalCents = Math.max(0, subtotalCents - discountCents)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.valid) {
        setAppliedCoupon(data.coupon)
      } else {
        setCouponError(data.error || t.invalidCoupon)
      }
    } catch {
      setCouponError(t.invalidCoupon)
    }
    setCouponLoading(false)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
  }

  const fetchClientSecret = useCallback(
    () => startCheckoutSession(selectedPlan!, appliedCoupon?.code),
    [selectedPlan, appliedCoupon]
  )

  if (!selectedPlan) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl">
          {t.selectPlan}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer border-border transition-all hover:border-primary hover:shadow-lg"
              onClick={() => setSelectedPlan(product.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{product.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-2xl font-bold text-primary">
                  ${(product.priceInCents / 100).toFixed(0)}
                  {product.id === "gold-pro" && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {t.perMonth}
                    </span>
                  )}
                </p>
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                <ul className="space-y-1">
                  {(PLAN_FEATURES[product.id] || []).slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-4 w-full" variant="outline">
                  {t.secureCheckout}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        type="button"
        onClick={() => {
          setSelectedPlan(null)
          setPaymentMethod(null)
          handleRemoveCoupon()
        }}
        className="mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t.back}
      </button>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                {t.orderSummary}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  {selectedProduct?.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedProduct?.description}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                  {t.features}
                </p>
                <ul className="space-y-1">
                  {(PLAN_FEATURES[selectedPlan] || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="border-border" />

              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">
                        {appliedCoupon.code}
                      </span>
                      <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
                        {appliedCoupon.discount_type === "percent"
                          ? `${appliedCoupon.discount_value}% off`
                          : `$${appliedCoupon.discount_value} off`}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t.couponPlaceholder}
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponError("")
                      }}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t.applyCoupon
                      )}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-1 text-xs text-red-400">{couponError}</p>
                )}
              </div>

              <hr className="border-border" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.subtotal}</span>
                  <span>${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>{t.discount}</span>
                    <span>-${(discountCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>{t.total}</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Label htmlFor="checkout-email" className="mb-2 block text-sm font-medium">
                {t.emailLabel}
              </Label>
              <Input
                id="checkout-email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Label htmlFor="checkout-telegram" className="mb-2 mt-4 block text-sm font-medium">
                {t.telegramLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="checkout-telegram"
                type="text"
                required
                placeholder={t.telegramPlaceholder}
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.choosePayment}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!telegram.trim() && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {t.telegramRequired}
                </p>
              )}
              <div className={`space-y-3 ${!telegram.trim() ? "pointer-events-none opacity-50" : ""}`}>
              <OKXPayButton
                plan={selectedPlan}
                prefillEmail={email || undefined}
                prefillTelegram={telegram || undefined}
                couponCode={appliedCoupon?.code}
                className="w-full justify-start gap-3 border border-border bg-transparent text-foreground hover:border-primary/50 hover:bg-primary/5 h-auto p-4"
              />

              <NowPaymentsButton
                plan={selectedPlan}
                prefillEmail={email || undefined}
                prefillTelegram={telegram || undefined}
                couponCode={appliedCoupon?.code}
                className="w-full justify-start gap-3 border border-border bg-transparent text-foreground hover:border-primary/50 hover:bg-primary/5 h-auto p-4"
              />

              <button
                type="button"
                onClick={() => setShowEgypt(!showEgypt)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                  showEgypt
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🇪🇬</span>
                  <span className="font-medium">{t.egyptPayment}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    showEgypt ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showEgypt && (
                <div className="rounded-lg border border-border p-4">
                  <EgyptPayment />
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}