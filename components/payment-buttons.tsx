"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const t = (locale: string, key: string) => {
  const ar: Record<string, string> = {
    payWithOKX: "الدفع عبر OKX",
    payWithCrypto: "الدفع بالعملات الرقمية",
    loadingPayment: "جاري تحميل تفاصيل الدفع…",
    enterEmail: "أدخل بريدك الإلكتروني للحصول على عنوان الدفع",
    getPaymentDetails: "الحصول على تفاصيل الدفع",
    cancel: "إلغاء",
    close: "إغلاق",
    paymentConfirmed: "تم تأكيد الدفع!",
    network: "الشبكة",
    sendExactly: "أرسل بالضبط",
    to: "إلى",
    orderRef: "رقم الطلب",
    networkFeesNotice: "يرجى إرسال المبلغ + رسوم الشبكة لضمان استلام الدفعة بالكامل.",
    sendOnlyUSDT: "أرسل فقط USDT على",
    wrongNetwork: "شبكة خاطئة = خسارة الأموال.",
    verifyPayment: "لقد دفعت — تحقق من الدفع",
    checking: "جاري التحقق…",
    copied: "تم النسخ!",
    copy: "نسخ",
    enterEmailContinue: "أدخل بريدك الإلكتروني للمتابعة",
    continueToPayment: "متابعة الدفع",
    loading: "جاري التحميل…",
  };
  const en: Record<string, string> = {
    payWithOKX: "Pay with OKX",
    payWithCrypto: "Pay with Crypto",
    loadingPayment: "Loading payment details…",
    enterEmail: "Enter your email to get the payment address",
    getPaymentDetails: "Get Payment Details",
    cancel: "Cancel",
    close: "Close",
    paymentConfirmed: "Payment Confirmed!",
    network: "Network",
    sendExactly: "Send exactly",
    to: "to:",
    orderRef: "Order ref",
    networkFeesNotice: "Please send the amount + network fees to ensure the full payment is received.",
    sendOnlyUSDT: "Send only USDT on",
    wrongNetwork: "Wrong network = lost funds.",
    verifyPayment: "I’ve Paid — Verify Payment",
    checking: "Checking…",
    copied: "Copied!",
    copy: "Copy",
    enterEmailContinue: "Enter your email to continue",
    continueToPayment: "Continue to Payment",
    loading: "Loading…",
  };
  return (locale === "ar" ? ar[key] : en[key]) || en[key] || key;
};


// ─── Types ────────────────────────────────────────────────────────────────────

type OKXPayData = {
  orderId: string
  address: string
  chain: string
  amount: string
  currency: string
  description: string
}

// ─── OKX Pay Modal ────────────────────────────────────────────────────────────

function OKXPayModal({
  plan,
  prefillEmail,
  couponCode,
  onClose,
}: {
  plan: string
  prefillEmail?: string
  couponCode?: string
  onClose: () => void
}) {
  const locale = useLocale()
  const [email, setEmail] = useState(prefillEmail || "")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [payInfo, setPayInfo] = useState<OKXPayData | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ status: string; message: string; tgInviteLink?: string } | null>(null)

  // If prefillEmail given, fetch address immediately on mount
  const [autoFetched, setAutoFetched] = useState(false)
  if (prefillEmail && !autoFetched && !payInfo && !loading) {
    setAutoFetched(true)
    setLoading(true)
    fetch("/api/okx-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email: prefillEmail, couponCode }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.address) setPayInfo(data)
        else alert(data.error || "Something went wrong.")
      })
      .catch(() => alert("Something went wrong. Please try again."))
      .finally(() => setLoading(false))
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGetDetails = async () => {
    if (!email || !email.includes("@")) { alert("Please enter a valid email."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/okx-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email, couponCode }),
      })
      const data = await res.json()
      if (data.address) setPayInfo(data)
      else alert(data.error || "Something went wrong.")
    } catch { alert("Something went wrong. Please try again.") }
    finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (!payInfo) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch("/api/okx-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: payInfo.orderId }),
      })
      setVerifyResult(await res.json())
    } catch { setVerifyResult({ status: "error", message: "Verification failed. Please try again." }) }
    finally { setVerifying(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[hsl(210,60%,50%)]/30 bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-center text-lg font-bold text-foreground">{t(locale, "payWithOKX")}</h3>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t(locale, "loadingPayment")}
          </div>
        ) : !payInfo ? (
          <>
            <p className="mb-4 text-center text-sm text-muted-foreground">{t(locale, "enterEmail")}</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[hsl(210,60%,50%)]/20 bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-[hsl(210,60%,50%)]"
            />
            <Button type="button" className="mb-2 w-full bg-[hsl(210,60%,50%)] text-foreground hover:bg-[hsl(210,60%,40%)]" onClick={handleGetDetails}>
              Get Payment Details
            </Button>
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-[hsl(210,60%,50%)]/30 py-2 text-sm text-muted-foreground hover:bg-[hsl(210,60%,50%)]/10">{t(locale, "cancel")}</button>
          </>
        ) : verifyResult?.status === "paid" ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">✅</div>
            <p className="text-lg font-bold text-green-400">{t(locale, "paymentConfirmed")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{verifyResult.message}</p>
            {verifyResult.tgInviteLink && (
              <a
                href={verifyResult.tgInviteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg bg-[#229ED9] py-3 text-sm font-bold text-white hover:bg-[#1a8bbf] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.613c-.15.677-.546.842-1.107.523l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.332-.373-.12L7.48 14.748l-2.95-.924c-.642-.2-.655-.642.134-.951l11.532-4.448c.535-.194 1.003.13.366.823z"/></svg>
                {locale === "ar" ? "انضم إلى مجموعة تيليجرام" : "Join Telegram Group"}
              </a>
            )}
            <button type="button" onClick={onClose} className="mt-3 w-full rounded-lg border border-[hsl(210,60%,50%)]/30 py-2 text-sm text-muted-foreground hover:bg-[hsl(210,60%,50%)]/10">{t(locale, "close")}</button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-sm text-muted-foreground">{payInfo.description}</p>
            <div className="mb-3 rounded-lg border border-[hsl(210,60%,50%)]/20 bg-background p-4 text-center">
              <p className="text-3xl font-bold text-[hsl(210,60%,50%)]">{payInfo.amount} {payInfo.currency}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(locale, "network")}: {payInfo.chain}</p>
            </div>
            <div className="mb-3">
              <p className="mb-1 text-xs text-muted-foreground">{t(locale, "sendExactly")} {payInfo.amount} USDT {t(locale, "to")}</p>
              <div className="flex items-center gap-2 rounded-lg border border-[hsl(210,60%,50%)]/20 bg-background p-3">
                <span className="flex-1 break-all font-mono text-xs text-foreground">{payInfo.address}</span>
                <button type="button" onClick={() => copy(payInfo.address)} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-[hsl(210,60%,50%)] hover:bg-[hsl(210,60%,50%)]/10">
                  {copied ? t(locale, "copied") : t(locale, "copy")}
                </button>
              </div>
            </div>
            <p className="mb-1 text-xs text-muted-foreground">{t(locale, "orderRef")}: <span className="font-mono text-foreground">{payInfo.orderId}</span></p>
        <p className="mb-2 rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-400">
              {t(locale, "networkFeesNotice")}
            </p>
            <p className="mb-4 rounded-lg bg-yellow-500/10 p-3 text-center text-xs text-yellow-400">
              ⚠️ {t(locale, "sendOnlyUSDT")} {payInfo.chain}. {t(locale, "wrongNetwork")}
            </p>
            {verifyResult && verifyResult.status !== "paid" && (
              <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-400">{verifyResult.message}</p>
            )}
            <Button type="button" className="mb-2 w-full bg-green-600 text-white hover:bg-green-700" onClick={handleVerify} disabled={verifying}>
              {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t(locale, "checking")}</> : t(locale, "verifyPayment")}
            </Button>
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-[hsl(210,60%,50%)]/30 py-2 text-sm text-muted-foreground hover:bg-[hsl(210,60%,50%)]/10">{t(locale, "close")}</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── OKX Pay Button ───────────────────────────────────────────────────────────

export function OKXPayButton({
  plan,
  className,
  prefillEmail,
  couponCode,
}: {
  plan: string
  className?: string
  prefillEmail?: string
  couponCode?: string
}) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && <OKXPayModal plan={plan} prefillEmail={prefillEmail} couponCode={couponCode} onClose={() => setOpen(false)} />}
      <Button type="button" className={className} size="lg" onClick={() => setOpen(true)}>
        <svg className="mr-2 h-5 w-5" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="#000"/>
          <rect x="6" y="13.5" width="6" height="5" rx="1" fill="#fff"/>
          <rect x="13" y="13.5" width="6" height="5" rx="1" fill="#fff"/>
          <rect x="20" y="13.5" width="6" height="5" rx="1" fill="#fff"/>
        </svg>{t(locale, "payWithOKX")}</Button>
    </>
  )
}

// ─── NowPayments Button ───────────────────────────────────────────────────────

export function NowPaymentsButton({
  plan,
  className,
  prefillEmail,
  couponCode,
}: {
  plan: string
  className?: string
  prefillEmail?: string
  couponCode?: string
}) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(prefillEmail || "")
  const [loading, setLoading] = useState(false)

  const handlePay = async (emailToUse: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: emailToUse, couponCode }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || "Something went wrong.")
    } catch { alert("Something went wrong. Please try again.") }
    finally { setLoading(false) }
  }

  const handleClick = () => {
    if (prefillEmail) { handlePay(prefillEmail); return }
    setOpen(true)
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-[hsl(210,60%,50%)]/30 bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-center text-lg font-bold text-foreground">{t(locale, "payWithCrypto")}</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">{t(locale, "enterEmailContinue")}</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[hsl(210,60%,50%)]/20 bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-[hsl(210,60%,50%)]"
            />
            <Button type="button" className="mb-2 w-full bg-[hsl(210,60%,50%)] text-foreground hover:bg-[hsl(210,60%,40%)]" onClick={() => handlePay(email)} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t(locale, "loading")}</> : t(locale, "continueToPayment")}
            </Button>
            <button type="button" onClick={() => setOpen(false)} className="w-full rounded-lg border border-[hsl(210,60%,50%)]/30 py-2 text-sm text-muted-foreground hover:bg-[hsl(210,60%,50%)]/10">{t(locale, "cancel")}</button>
          </div>
        </div>
      )}
      <Button type="button" className={className} size="lg" onClick={handleClick} disabled={loading}>
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t(locale, "loading")}</>
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
            </svg>{t(locale, "payWithCrypto")}</>
        )}
      </Button>
    </>
  )
}
