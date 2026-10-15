"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Loader2, CheckCircle2, Wallet, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePaymentSettings } from "@/hooks/use-payment-settings"
import { PaymentModalShell } from "@/components/payment-buttons"

const dict = {
  en: {
    title: "Pay Remaining Balance",
    choose: "Choose a payment method",
    okx: "Pay with OKX (USDT)",
    crypto: "Pay with Crypto (NowPayments)",
    visa: "Pay with Visa (Whop)",
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
    visa: "الدفع بالفيزا (Whop)",
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

  const startPayment = async (method: "okx" | "nowpayments" | "whop") => {
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
      if (method === "nowpayments" || method === "whop") {
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
  const disabledWhop = !settingsLoading && !settings.whop

  return (
    <PaymentModalShell
      locale={locale}
      icon={<Wallet className="mx-auto h-8 w-8 text-primary" />}
      title={l.title}
      subtitle={!paid && !payInfo && !loading ? l.choose : undefined}
      onClose={onClose}
      closeDisabled={loading}
    >
      {paid ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-500">{l.paid}</p>
          <p className="mt-2 text-sm text-muted-foreground">{l.paidMessage}</p>
          <Button type="button" size="lg" className="mt-5 h-12 w-full rounded-xl text-base font-bold" onClick={onClose}>{l.close}</Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {l.loading}
        </div>
      ) : !payInfo ? (
        <>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">{error}</p>}
          {disabledOkx && disabledNow && disabledWhop ? (
            <p className="rounded-xl border border-border p-3 text-center text-sm text-muted-foreground">{l.unavailable}</p>
          ) : (
            <div className="space-y-2.5">
              {!disabledWhop && (
                <Button type="button" variant="outline" size="lg" className="h-12 w-full rounded-xl" onClick={() => startPayment("whop")}>{l.visa}</Button>
              )}
              {!disabledOkx && (
                <Button type="button" variant="outline" size="lg" className="h-12 w-full rounded-xl" onClick={() => startPayment("okx")}>{l.okx}</Button>
              )}
              {!disabledNow && (
                <Button type="button" variant="outline" size="lg" className="h-12 w-full rounded-xl" onClick={() => startPayment("nowpayments")}>{l.crypto}</Button>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="w-full rounded-xl py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">{l.cancel}</button>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-muted-foreground">{payInfo.description}</p>

          <div className="rounded-xl border border-border bg-background p-4 text-center">
            <p className="text-3xl font-extrabold text-primary">{payInfo.amount} {payInfo.currency}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l.network}: {payInfo.chain}</p>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{l.sendExactly} {payInfo.amount} USDT {l.to}</p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
              <span dir="ltr" className="flex-1 break-all font-mono text-xs text-foreground">{payInfo.address}</span>
              <button type="button" onClick={() => copy(payInfo.address)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
                {copied ? l.copied : l.copy}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{l.orderRef}: <span className="font-mono text-foreground">{payInfo.orderId}</span></p>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">{l.networkFeesNotice}</p>
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">{error}</p>}

          <Button type="button" size="lg" className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700" onClick={handleVerify} disabled={verifying}>
            {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {l.checking}</> : l.verifyPayment}
          </Button>
          <button type="button" onClick={onClose} className="w-full rounded-xl py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">{l.close}</button>
        </>
      )}
    </PaymentModalShell>
  )
}
