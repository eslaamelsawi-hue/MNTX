"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, Check, Copy, Info, Send, Smartphone, Upload, X } from "lucide-react"
import { usePaymentSettings } from "@/hooks/use-payment-settings"
import { PLAN_PRICES } from "@/lib/plan-pricing"
import { usdToEgp, formatEgp } from "@/lib/egp"

/** Instapay's own purple/orange, used only inside this modal — the surface
 *  belongs to their brand, while the rest of the site stays amber. */
const PURPLE = "#7C3AED"
const ORANGE = "#F59E0B"

function AccountCard({
  logo,
  label,
  number,
  onCopy,
  copied,
}: {
  logo: React.ReactNode
  label: string
  number: string
  onCopy: () => void
  copied: boolean
}) {
  const t = useTranslations("egyptPayment")
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {logo}
        <div className="min-w-0">
          <p className="text-xs text-white/50">{label}</p>
          <p dir="ltr" className="truncate font-mono text-base font-bold tracking-wide text-white">
            {number}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`${t("copy")} ${number}`}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
        style={{
          borderColor: copied ? "rgba(16,185,129,.5)" : "rgba(124,58,237,.5)",
          background: copied ? "rgba(16,185,129,.12)" : "rgba(124,58,237,.12)",
          color: copied ? "#34D399" : "#C4B5FD",
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  )
}

function Step({
  num,
  children,
  icon,
  highlight,
}: {
  num: number
  children: React.ReactNode
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border p-3.5 transition-colors"
      style={
        highlight
          ? { borderColor: "rgba(245,158,11,.5)", background: "rgba(245,158,11,.07)", boxShadow: "0 0 24px -8px rgba(245,158,11,.45)" }
          : { borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }
      }
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: highlight ? ORANGE : PURPLE }}
      >
        {num}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-white/80">{children}</div>
      <span className="shrink-0 text-white/30">{icon}</span>
    </div>
  )
}

type CheckoutContext = {
  /** Checkout this was opened from, so the amount can be derived from it. */
  plan?: string
  /** Final USD total (after any coupon), when the caller already knows it. */
  amountUsd?: number
  /** Set when paying in two instalments: the remainder due later. */
  secondAmountUsd?: number
  /** Prefilled from the checkout form, so the buyer doesn't retype it. */
  email?: string
  telegram?: string
  /** Passed to the server, which re-derives the price from them itself. */
  couponCode?: string
  splitPayment?: boolean
  preferredDate?: string
  preferredSlotId?: string
}

export function InstapayModal({
  plan,
  amountUsd,
  secondAmountUsd,
  email: prefillEmail,
  telegram,
  couponCode,
  splitPayment,
  preferredDate,
  preferredSlotId,
  onClose,
}: CheckoutContext & { onClose: () => void }) {
  const t = useTranslations("egyptPayment")
  const { settings } = usePaymentSettings()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState(prefillEmail ?? "")
  const [senderName, setSenderName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [proofError, setProofError] = useState("")

  // Escape to close, and no scrolling the page behind the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value.trim())
      setCopiedKey(key)
      setToast(true)
      setTimeout(() => setCopiedKey(null), 2000)
      setTimeout(() => setToast(false), 2200)
    } catch {
      /* clipboard blocked — the number is visible and selectable anyway */
    }
  }

  /**
   * Records the order server-side (which recomputes what's owed), uploads the
   * receipt straight to storage with the signed URL it hands back, then puts
   * the order in the admin's verification queue. Nothing here grants access —
   * an admin still has to look at the receipt.
   */
  const submitProof = async () => {
    setProofError("")
    if (!email.includes("@")) { setProofError(t("proofNeedEmail")); return }
    if (!file) { setProofError(t("proofNeedFile")); return }

    setSubmitting(true)
    try {
      const res = await fetch("/api/instapay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          email,
          telegram,
          couponCode,
          splitPayment,
          preferredDate,
          preferredSlotId,
          filename: file.name,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setProofError(data.error || t("proofFailed")); return }

      const put = await fetch(data.signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": data.contentType || file.type || "application/octet-stream" },
      })
      if (!put.ok) { setProofError(t("proofFailed")); return }

      const confirm = await fetch("/api/instapay", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId, senderName }),
      })
      if (!confirm.ok) { setProofError(t("proofFailed")); return }
      setSubmitted(true)
    } catch {
      setProofError(t("proofFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const rate = settings.usdToEgp
  // The coaching price is admin-configurable, so it comes from settings
  // rather than the static table.
  const priceFor = (id: string) => (id === "coaching" ? settings.coachingPrice : PLAN_PRICES[id]?.amount)
  const resolvedUsd = amountUsd ?? (plan ? priceFor(plan) : undefined)
  const egpFirst = resolvedUsd ? usdToEgp(resolvedUsd, rate) : null
  const egpSecond = secondAmountUsd ? usdToEgp(secondAmountUsd, rate) : null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-2xl duration-300 animate-in fade-in zoom-in-95"
        style={{ background: "#0B0B0F" }}
      >
        {/* glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-52"
          style={{ background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(124,58,237,.35), transparent 70%)" }}
        />

        <div className="relative p-5 sm:p-6">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="absolute end-4 top-4 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* header */}
          <div className="flex flex-col items-center pt-2 text-center">
            <img src="/payment-logos/instapay.png" alt="Instapay" className="h-12 w-12 object-contain" />
            <h2 className="mt-3 text-xl font-extrabold leading-snug text-white">
              {t("title")}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(90deg, ${PURPLE}, ${ORANGE})` }}
              >
                {t("titleHighlight")}
              </span>
            </h2>
          </div>

          {/* warning */}
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-xs font-semibold leading-relaxed text-red-300">{t("nonRefundable")}</p>
          </div>

          {/* steps */}
          <h3 className="mb-3 mt-6 text-sm font-bold text-white">{t("howToPay")}</h3>
          <div className="space-y-2.5">
            <Step num={1} icon={<Smartphone className="h-4 w-4" />}>
              {t("step1")} <span className="font-bold text-white">{t("step1Bold")}</span> {t("step1End")}
            </Step>

            <Step num={2} icon={<Send className="h-4 w-4" />}>
              {egpFirst ? (
                <>
                  <p>
                    {t("step2Send")}{" "}
                    <span className="font-bold" style={{ color: ORANGE }}>
                      {formatEgp(egpFirst)} {t("egp")}
                    </span>{" "}
                    <span className="text-xs text-white/45">(${resolvedUsd})</span>
                  </p>
                  {egpSecond && (
                    <p className="mt-1 text-xs text-white/50">
                      {t("step2Remaining")}{" "}
                      <span className="font-bold text-white/80">
                        {formatEgp(egpSecond)} {t("egp")}
                      </span>{" "}
                      (${secondAmountUsd})
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  {(["starter", "coaching"] as const).map((id) => {
                    const usd = priceFor(id)
                    if (!usd) return null
                    return (
                      <div key={id} className="flex items-center justify-between gap-3">
                        <span className="text-white/70">{t(`plans.${id}`)}</span>
                        <span className="font-bold" style={{ color: ORANGE }}>
                          {formatEgp(usdToEgp(usd, rate))} {t("egp")}
                          <span className="ms-1.5 text-xs font-normal text-white/45">(${usd})</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Step>

            <Step num={3} highlight icon={<Check className="h-4 w-4" />}>
              <p>{t("step3")}</p>
              <a
                href="https://t.me/mentixsupport"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-bold underline underline-offset-4"
                style={{ color: ORANGE }}
              >
                {t("step3Here")}
              </a>
            </Step>
          </div>

          {/* accounts */}
          <h3 className="mb-3 mt-6 text-sm font-bold text-white">{t("paymentDetails")}</h3>
          <div className="space-y-2.5">
            <AccountCard
              label={t("instapay")}
              number={settings.instapayNumber}
              copied={copiedKey === "instapay"}
              onCopy={() => copy("instapay", settings.instapayNumber)}
              logo={<img src="/payment-logos/instapay.png" alt="" className="h-9 w-9 shrink-0 object-contain" />}
            />
            {/* Both wallets often sit on the same number — showing it twice
                just reads as a mistake. */}
            {settings.vodafoneNumber.trim() !== settings.instapayNumber.trim() && (
            <AccountCard
              label={t("vodafoneCash")}
              number={settings.vodafoneNumber}
              copied={copiedKey === "vodafone"}
              onCopy={() => copy("vodafone", settings.vodafoneNumber)}
              logo={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-[10px] font-black leading-none text-white">
                  VF
                </span>
              }
            />
            )}
          </div>

          {/* footer note */}
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
            <p className="text-xs leading-relaxed text-white/60">{t("screenshotNote")}</p>
          </div>

          {/* proof of transfer — only for a checkout tied to a specific plan */}
          {plan && (
            submitted ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-center">
                <Check className="mx-auto h-6 w-6 text-emerald-400" />
                <p className="mt-2 text-sm font-bold text-emerald-300">{t("proofDone")}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{t("proofDoneBody")}</p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-white">{t("proofTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{t("proofSubtitle")}</p>

                <div className="mt-3 space-y-2.5">
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setProofError("") }}
                    placeholder={t("proofEmail")}
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={t("proofSenderName")}
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                    className="hidden"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setProofError("") }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-11 w-full items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 text-sm text-white/60 transition-colors hover:border-white/40 hover:text-white"
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="truncate">{file ? file.name : t("proofChoose")}</span>
                  </button>
                </div>

                {proofError && <p className="mt-2 text-xs font-semibold text-red-400">{proofError}</p>}

                <button
                  type="button"
                  onClick={submitProof}
                  disabled={submitting}
                  className="mt-3 h-11 w-full rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: `linear-gradient(90deg, ${PURPLE}, ${ORANGE})` }}
                >
                  {submitting ? t("proofSubmitting") : t("proofSubmit")}
                </button>
              </div>
            )
          )}
        </div>

        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg">
              {t("copiedToast")}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Checkout entry point: the button plus the modal it opens. */
export function InstapayPayButton({ className, ...context }: CheckoutContext & { className?: string }) {
  const t = useTranslations("egyptPayment")
  const [open, setOpen] = useState(false)
  const { settings, loading } = usePaymentSettings()

  if (!loading && (!settings.subscriptionsOpen || !settings.egypt)) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "flex w-full items-center justify-between rounded-lg border border-border p-4 text-left transition-all hover:border-primary/50"
        }
      >
        <span className="flex items-center gap-3">
          <img src="/payment-logos/instapay.png" alt="" className="h-6 w-6 object-contain" />
          <span className="font-medium">{t("payWithInstapay")}</span>
        </span>
        <span className="text-xs text-muted-foreground">🇪🇬</span>
      </button>

      {open && <InstapayModal {...context} onClose={() => setOpen(false)} />}
    </>
  )
}
