"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Loader2, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePaymentSettings } from "@/hooks/use-payment-settings"

const dict = {
  en: {
    title: "Pay Remaining Balance",
    choose: "Choose a payment method",
    okx: "Pay with OKX (USDT)",
    crypto: "Pay with Crypto (NowPayments)",
    unavailable: "No payment methods are currently available. Please contact support.",
    loading: "Loading…",
    cancel: "Cancel",
    close: "Close",
    network: "Network",
    sendExactly: "Send exactly",
    to: "to:",
    copy: "Copy",
    copied: "Copied!",
    orderRef: "Order ref",
    verifyPayment: "I've Paid — Verify Payment",
    checking: "Checking…",
    paid: "Payment Confirmed!",
    paidMessage: "Your remaining balance has been settled. Thank you!",
    networkFeesNotice: "Please send the amount + network fees to ensure the full payment is received.",
    error: "Something went wrong. Please try again.",
  },
  ar: {
    title: "دفع الرصيد المتبقي",
    choose: "اختر طريقة الدفع",
    okx: "الدفع عبر OKX (USDT)",
    crypto: "الدفع بالعملات الرقمية (NowPayments)",
    unavailable: "لا توجد طرق دفع متاحة حاليًا. يرجى التواصل مع الدعم.",
    loading: "جاري التحميل…",
    cancel: "إلغاء",
    close: "إغلاق",
    network: "الشبكة",
    sendExactly: "أرسل بالضبط",
    to: "إلى",
    copy: "نسخ",
    copied: "تم النسخ!",
    orderRef: "رقم الطلب",
    verifyPayment: "لقد دفعت — تحقق من الدفع",
    checking: "جاري التحقق…",
    paid: "تم تأكيد الدفع!",
    paidMessage: "تم تسوية رصيدك المتبقي. شكرًا لك!",
    networkFeesNotice: "يرجى إرسال المبلغ + رسوم الشبكة لضمان استلام الدفعة بالكامل.",
    error: "حدث خطأ ما. حاول مرة أخرى.",
  },
}

type OkxPayInfo = { orderId: string; address: string; chain: string; amount: string; currency: string; description: string }

export function PayInstallmentModal({
  installmentId,
  onClose,
  onPaid,
}: {
  installmentId: string
  onClose: () => void
  onPaid: () => void
}) {
  const locale = useLocale()
  const l = dict[locale as keyof typeof dict] || dict.en
  const { settings, loading: settingsLoading } = usePaymentSettings()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [payInfo, setPayInfo] = useState<OkxPayInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [paid, setPaid] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startPayment = async (method: "okx" | "nowpayments") => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/invoices/pay-installment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId, method }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || l.error); setLoading(false); return }
      if (method === "nowpayments") {
        window.location.href = data.url
        return
      }
      setPayInfo(data)
    } catch {
      setError(l.error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!payInfo) return
    setVerifying(true)
    setError("")
    try {
      const res = await fetch("/api/okx-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: payInfo.orderId }),
      })
      const data = await res.json()
      if (data.status === "paid") {
        setPaid(true)
        onPaid()
      } else {
        setError(data.message || l.error)
      }
    } catch {
      setError(l.error)
    } finally {
      setVerifying(false)
    }
  }

  const disabledOkx = !settingsLoading && !settings.okx
  const disabledNow = !settingsLoading && !settings.nowpayments

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{l.title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {paid ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <p className="text-lg font-bold text-emerald-500">{l.paid}</p>
            <p className="mt-2 text-sm text-muted-foreground">{l.paidMessage}</p>
            <Button type="button" className="mt-4 w-full" onClick={onClose}>{l.close}</Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {l.loading}
          </div>
        ) : !payInfo ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{l.choose}</p>
            {error && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-400">{error}</p>}
            {disabledOkx && disabledNow ? (
              <p className="rounded-lg border border-border/60 p-3 text-center text-sm text-muted-foreground">{l.unavailable}</p>
            ) : (
              <div className="space-y-2">
                {!disabledOkx && (
                  <Button type="button" className="w-full" onClick={() => startPayment("okx")}>{l.okx}</Button>
                )}
                {!disabledNow && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => startPayment("nowpayments")}>{l.crypto}</Button>
                )}
              </div>
            )}
            <button type="button" onClick={onClose} className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted">{l.cancel}</button>
          </>
        ) : (
          <>
            <p className="mb-3 text-center text-sm text-muted-foreground">{payInfo.description}</p>
            <div className="mb-3 rounded-lg border border-border bg-background p-4 text-center">
              <p className="text-3xl font-bold text-primary">{payInfo.amount} {payInfo.currency}</p>
              <p className="mt-1 text-xs text-muted-foreground">{l.network}: {payInfo.chain}</p>
            </div>
            <div className="mb-3">
              <p className="mb-1 text-xs text-muted-foreground">{l.sendExactly} {payInfo.amount} USDT {l.to}</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <span className="flex-1 break-all font-mono text-xs text-foreground">{payInfo.address}</span>
                <button type="button" onClick={() => copy(payInfo.address)} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                  {copied ? l.copied : l.copy}
                </button>
              </div>
            </div>
            <p className="mb-1 text-xs text-muted-foreground">{l.orderRef}: <span className="font-mono text-foreground">{payInfo.orderId}</span></p>
            <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-400">{l.networkFeesNotice}</p>
            {error && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-400">{error}</p>}
            <Button type="button" className="mb-2 w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleVerify} disabled={verifying}>
              {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {l.checking}</> : l.verifyPayment}
            </Button>
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted">{l.close}</button>
          </>
        )}
      </div>
    </div>
  )
}
