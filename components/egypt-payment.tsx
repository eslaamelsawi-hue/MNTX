"use client"

import { useState } from "react"
import { Copy, Check, CreditCard } from "lucide-react"
import { useTranslations } from 'next-intl'
import { usePaymentSettings } from "@/hooks/use-payment-settings"

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('egyptPayment')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 active:scale-95"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? t('copied') : t('copy')}
    </button>
  )
}

function StepNumber({ num }: { num: number }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {num}
    </span>
  )
}

export function EgyptPayment() {
  const t = useTranslations('egyptPayment')
  const { settings, loading } = usePaymentSettings()

  if (!loading && (!settings.subscriptionsOpen || !settings.egypt)) {
    return (
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
            {!settings.subscriptionsOpen
              ? "We're not accepting new subscriptions right now. Please check back later."
              : "This payment method is currently unavailable. Please try another payment method."}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 pb-20">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border p-6 md:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
            <span className="text-balance">
              {t('title')}{" "}
              <span className="text-primary">{t('titleHighlight')}</span>
            </span>
          </h2>

          <p className="mb-6 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
            ⚠️ All payments are final and non-refundable.
          </p>

          <h3 className="mb-6 text-lg font-bold text-foreground">{t('howToPay')}</h3>

          <ol className="mb-8 space-y-5">
            <li className="flex items-center gap-4 border-b border-border pb-5">
              <StepNumber num={1} />
              <p className="text-sm text-muted-foreground md:text-base">
                {t('step1')}{" "}
                <span className="font-bold text-foreground">{t('step1Bold')}</span>
                {" "}{t('step1End')}
              </p>
            </li>
            <li className="flex items-start gap-4 border-b border-border pb-5">
              <StepNumber num={2} />
              <p className="text-sm text-muted-foreground md:text-base">
                {t('step2')}{" "}
                <span className="font-bold text-foreground">{t('step2StarterPlan')}</span>
                {" "}{t('step2Pay')}{" "}
                <span className="font-bold text-primary">{t('step2Amount')}</span>
                {" "}{t('step2And')}{" "}
                <span className="font-bold text-foreground">{t('step2CoachingPlan')}</span>
                {" "}{t('step2ContactUs')}
              </p>
            </li>
            <li className="flex items-center gap-4">
              <StepNumber num={3} />
              <p className="text-sm text-muted-foreground md:text-base">
                {t('step3')}{" "}
                <a
                  href="https://t.me/mentixsupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/here relative inline-flex items-center gap-1 font-bold"
                >
                  <span className="relative inline-block animate-here-bounce rounded-md bg-primary px-2.5 py-0.5 text-xs text-primary-foreground shadow-[0_0_12px_hsl(43,100%,50%,0.4)] transition-shadow hover:shadow-[0_0_20px_hsl(43,100%,50%,0.6)]">
                    {t('step3Here')}
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                    </span>
                  </span>
                  <svg
                    className="h-4 w-4 animate-here-point text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 7l10 10" />
                    <path d="M17 7v10H7" />
                  </svg>
                </a>
              </p>
            </li>
          </ol>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-4">
              <div className="flex items-center gap-3">
                <img src="/payment-logos/instapay.png" alt="Instapay Logo" className="h-8 w-8 object-contain" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('instapay')}</p>
                  <p className="text-base font-bold tracking-wide text-foreground">
                    01158022001
                  </p>
                </div>
              </div>
              <CopyButton text="01158022001" />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('vodafoneCash')}</p>
                  <p className="text-base font-bold tracking-wide text-foreground">
                    01062791235
                  </p>
                </div>
              </div>
              <CopyButton text="01062791235" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
