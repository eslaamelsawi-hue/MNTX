"use client"

import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { CheckCircle2, ArrowRight, Home, Mail, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

const KNOWN_PLANS = [
  "starter",
  "coaching",
  "funded-challenge",
  "gold-pro",
  "extend-1m",
  "extend-2m",
  "extend-3m",
  "extend-6m",
  "test",
]

export function PaymentSuccess({
  plan,
  order,
  provider,
}: {
  plan?: string
  order?: string
  provider?: string
}) {
  const t = useTranslations("paymentSuccess")
  const planName = plan && KNOWN_PLANS.includes(plan) ? t(`plans.${plan}`) : plan
  const isStarter = plan === "starter"
  // Card providers (Whop) confirm instantly; crypto (NowPayments) confirms on-chain.
  const isCard = provider === "whop" || provider === "card" || provider === "stripe"

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center md:py-24">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2 className="h-11 w-11 text-green-400" />
      </div>

      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-400">
        {t("badge")}
      </span>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("subtitle")}</p>

      {(planName || order) && (
        <div className="mt-8 w-full rounded-xl border border-border bg-card p-5 text-start">
          {planName && (
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-sm text-muted-foreground">{t("planLabel")}</span>
              <span className="font-semibold text-foreground">{planName}</span>
            </div>
          )}
          {order && (
            <div className="flex items-center justify-between gap-4 border-t border-border py-1.5 pt-3">
              <span className="text-sm text-muted-foreground">{t("orderLabel")}</span>
              <span className="break-all font-mono text-xs text-foreground">{order}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 w-full space-y-3 text-start">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isCard ? t("confirmingNoteCard") : t("confirmingNote")}
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-4">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">{t("emailNote")}</p>
        </div>
        {isStarter && (
          <div className="flex items-start gap-3 rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/10 p-4">
            <Send className="mt-0.5 h-5 w-5 shrink-0 text-[#229ED9]" />
            <p className="text-sm leading-relaxed text-foreground">{t("starterNote")}</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="gap-2">
          <Link href="/dashboard">
            {t("dashboard")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" /> {t("backHome")}
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{t("needHelp")}</p>
    </section>
  )
}
