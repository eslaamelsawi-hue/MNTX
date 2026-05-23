"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, ArrowRight, Calendar, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { OKXPayButton, NowPaymentsButton } from "@/components/payment-buttons"

const plans = [
  {
    id: "extend-1m",
    labelKey: "plan1Label",
    priceLabel: "$199",
    badgeKey: null,
    featureKeys: ["featureSessions1", "featureCommunity", "featureStrategy", "featureTrade"],
  },
  {
    id: "extend-2m",
    labelKey: "plan2Label",
    priceLabel: "$379",
    badgeKey: null,
    featureKeys: ["featureSessions2", "featureCommunity", "featureStrategy", "featureTrade"],
  },
  {
    id: "extend-3m",
    labelKey: "plan3Label",
    priceLabel: "$699",
    badgeKey: "badgePopular",
    featureKeys: ["featureSessions3", "featureCommunity", "featureStrategy", "featureTrade", "featureProgress"],
  },
  {
    id: "extend-6m",
    labelKey: "plan4Label",
    priceLabel: "$1,499",
    badgeKey: "badgeBestValue",
    featureKeys: ["featureSessions6", "featureCommunity", "featureStrategy", "featureTrade", "featureProgress", "featurePriority"],
  },
]

export function ExtendMentorship() {
  const locale = useLocale()
  const t = useTranslations("extend")

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [telegram, setTelegram] = useState("")
  const [errors, setErrors] = useState<{ name?: string; email?: string; telegram?: string }>({})
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)

  const openDialog = (planId: string) => {
    setSelectedPlan(planId)
    setName("")
    setEmail("")
    setTelegram("")
    setErrors({})
    setShowPaymentMethods(false)
    setDialogOpen(true)
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = t("errorRequired")
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("errorEmail")
    if (!telegram.trim()) e.telegram = t("errorRequired")
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !selectedPlan) return

    if (!showPaymentMethods) {
      setShowPaymentMethods(true)
      // Send form data to Discord webhook (fire-and-forget)
      fetch("/api/extend-mentorship/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          name: name.trim(),
          email: email.trim(),
          telegram: telegram.trim().replace(/^@/, ""),
        }),
      }).catch(() => {})
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/extend-mentorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          locale,
          name: name.trim(),
          email: email.trim(),
          telegram: telegram.trim().replace(/^@/, ""),
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || t("errorMessage"))
      }
    } catch {
      alert(t("errorMessage"))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPlanData = plans.find((p) => p.id === selectedPlan)

  return (
    <div>
      {/* Hero */}
      <section className="relative px-4 pb-10 pt-10 text-center md:pt-16">
        <div className="mx-auto max-w-3xl">
          <Badge
            variant="outline"
            className="mb-6 animate-pulse rounded-full border-primary/30 bg-primary/10 px-5 py-2.5 text-base font-medium text-primary md:text-lg"
          >
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            {t("badge")}
          </Badge>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground text-balance md:text-6xl">
            {t("title")}{" "}
            <span className="text-primary">{t("titleHighlight")}</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {t("description")}
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{t("sessionNote")}</span>
          </div>

          <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            <p>{t("sessionDurationNotice")}</p>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isFeatured = plan.badgeKey === "badgeBestValue"
              const badgeLabel = plan.badgeKey ? t(plan.badgeKey) : null

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col transition-colors ${
                    isFeatured
                      ? "border-primary bg-card shadow-lg shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {badgeLabel && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground whitespace-nowrap">
                      {badgeLabel}
                    </div>
                  )}

                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-xl text-foreground">{t(plan.labelKey)}</CardTitle>
                    <div className="mt-4 flex flex-col items-center">
                      <span className="text-4xl font-bold text-primary">{plan.priceLabel}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2.5">
                      {plan.featureKeys.map((key) => (
                        <li key={key} className="flex items-start gap-2.5 text-sm text-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      variant={isFeatured ? "default" : "outline"}
                      onClick={() => openDialog(plan.id)}
                    >
                      {t("extendNow")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            {t("disclaimer")}
          </p>
        </div>
      </section>

      {/* Info Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t("dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedPlanData && (
                <>
                  {t(selectedPlanData.labelKey)} &mdash;{" "}
                  <span className="font-bold text-primary">{selectedPlanData.priceLabel}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="extend-name">{t("labelName")}</Label>
              <Input
                id="extend-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("placeholderName")}
                disabled={submitting}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extend-email">{t("labelEmail")}</Label>
              <Input
                id="extend-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("placeholderEmail")}
                disabled={submitting}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extend-telegram">{t("labelTelegram")}</Label>
              <Input
                id="extend-telegram"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder={t("placeholderTelegram")}
                disabled={submitting}
              />
              {errors.telegram && <p className="text-xs text-destructive">{errors.telegram}</p>}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {!showPaymentMethods ? (
                <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t("processing")}</>
                  ) : (
                    <>{t("proceedToPayment")} <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              ) : (
                <>
                  <NowPaymentsButton
                    plan={selectedPlan ?? ""}
                    prefillEmail={email}
                    className="w-full text-base bg-transparent border border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground"
                  />
                  <OKXPayButton
                    plan={selectedPlan ?? ""}
                    prefillEmail={email}
                    className="w-full text-base bg-transparent border border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground"
                  />
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
