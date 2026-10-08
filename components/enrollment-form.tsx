"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Check } from "lucide-react"
import { EgyptPayment } from "@/components/egypt-payment"
import { OKXPayButton, NowPaymentsButton, WhopPayButton } from "@/components/payment-buttons"
import { useTranslations } from 'next-intl'

const COUNTRY_CODES = [
  { code: "+1", country: "US", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "+20", country: "EG", flag: "\u{1F1EA}\u{1F1EC}" },
  { code: "+44", country: "UK", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "+91", country: "IN", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "+966", country: "SA", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "+971", country: "AE", flag: "\u{1F1E6}\u{1F1EA}" },
  { code: "+974", country: "QA", flag: "\u{1F1F6}\u{1F1E6}" },
  { code: "+965", country: "KW", flag: "\u{1F1F0}\u{1F1FC}" },
  { code: "+973", country: "BH", flag: "\u{1F1E7}\u{1F1ED}" },
  { code: "+968", country: "OM", flag: "\u{1F1F4}\u{1F1F2}" },
  { code: "+962", country: "JO", flag: "\u{1F1EF}\u{1F1F4}" },
  { code: "+961", country: "LB", flag: "\u{1F1F1}\u{1F1E7}" },
  { code: "+964", country: "IQ", flag: "\u{1F1EE}\u{1F1F6}" },
  { code: "+212", country: "MA", flag: "\u{1F1F2}\u{1F1E6}" },
  { code: "+216", country: "TN", flag: "\u{1F1F9}\u{1F1F3}" },
  { code: "+213", country: "DZ", flag: "\u{1F1E9}\u{1F1FF}" },
  { code: "+218", country: "LY", flag: "\u{1F1F1}\u{1F1FE}" },
  { code: "+249", country: "SD", flag: "\u{1F1F8}\u{1F1E9}" },
  { code: "+33", country: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "+49", country: "DE", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "+34", country: "ES", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "+39", country: "IT", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "+90", country: "TR", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "+92", country: "PK", flag: "\u{1F1F5}\u{1F1F0}" },
  { code: "+880", country: "BD", flag: "\u{1F1E7}\u{1F1E9}" },
  { code: "+60", country: "MY", flag: "\u{1F1F2}\u{1F1FE}" },
  { code: "+62", country: "ID", flag: "\u{1F1EE}\u{1F1E9}" },
  { code: "+63", country: "PH", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "+81", country: "JP", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "+82", country: "KR", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "+86", country: "CN", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "+55", country: "BR", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "+52", country: "MX", flag: "\u{1F1F2}\u{1F1FD}" },
  { code: "+61", country: "AU", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "+64", country: "NZ", flag: "\u{1F1F3}\u{1F1FF}" },
  { code: "+27", country: "ZA", flag: "\u{1F1FF}\u{1F1E6}" },
  { code: "+234", country: "NG", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "+254", country: "KE", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "+7", country: "RU", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "+380", country: "UA", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "+48", country: "PL", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "+31", country: "NL", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "+46", country: "SE", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "+47", country: "NO", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "+45", country: "DK", flag: "\u{1F1E9}\u{1F1F0}" },
  { code: "+41", country: "CH", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "+43", country: "AT", flag: "\u{1F1E6}\u{1F1F9}" },
  { code: "+32", country: "BE", flag: "\u{1F1E7}\u{1F1EA}" },
  { code: "+351", country: "PT", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "+30", country: "GR", flag: "\u{1F1EC}\u{1F1F7}" },
]

type FormData = {
  fullName: string
  email: string
  age: string
  ambitions: string
  experience: string
  budget: string
  countryCode: string
  whatsapp: string
}

export function EnrollmentForm() {
  const t = useTranslations('enrollment')
  
  const BUDGET_OPTIONS = [
    { label: t('budget500'), value: "500" },
    { label: t('budgetAbove1000'), value: "above-1000" },
    { label: t('budgetAbove2000'), value: "above-2000" },
  ]
  
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"forward" | "backward">("forward")
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    age: "",
    ambitions: "",
    experience: "",
    budget: "",
    countryCode: "+20",
    whatsapp: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [animating, setAnimating] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const totalSteps = 7

  useEffect(() => {
    if (inputRef.current && !submitted) {
      inputRef.current.focus()
    }
  }, [step, submitted])

  const isValidName = (name: string) => /^[a-zA-Z\u0600-\u06FF\s]+$/.test(name.trim())
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const canProceed = () => {
    switch (step) {
      case 0:
        return formData.fullName.trim().length > 0 && isValidName(formData.fullName)
      case 1:
        return formData.email.trim().length > 0 && isValidEmail(formData.email)
      case 2:
        return formData.age.trim().length === 2 && Number(formData.age) > 0
      case 3:
        return formData.ambitions.trim().length > 0
      case 4:
        return formData.experience.trim().length > 0
      case 5:
        return formData.budget.length > 0
      case 6: {
        const digits = formData.whatsapp.replace(/\D/g, "")
        return digits.length >= 10 && digits.length <= 11
      }
      default:
        return false
    }
  }

  const sendToDiscord = async () => {
    try {
      const budget = BUDGET_OPTIONS.find(opt => opt.value === formData.budget)?.label || formData.budget
      
      const embed = {
        title: "**New Enrollment**",
        description: `\`\`Full name:\`\` **${formData.fullName}**\n\n\`\`Email:\`\` **${formData.email}**\n\n\`\`Age:\`\` **${formData.age}**\n\n\`\`Budget:\`\` **${budget}**\n\n\`\`WhatsApp:\`\` \`\`\`${formData.countryCode} ${formData.whatsapp}\`\`\`\n\`\`Ambitions:\`\` \`\`\`${formData.ambitions}\`\`\`\n\`\`Experience:\`\` \`\`\`${formData.experience}\`\`\``,
        color: 0x5865F2,
        timestamp: new Date().toISOString()
      }

      await fetch("https://discord.com/api/webhooks/1469387225559994530/DN80ILiJkXs_-MEMYBXPid8mnBbNTPlAjScch0QZ8E8vtryw4-mk6Yg5om_43QC8ZJGx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeds: [embed] })
      })
    } catch (error) {
      console.error("Failed to send to Discord:", error)
    }
  }

  const goNext = () => {
    if (!canProceed() || animating) return
    setDirection("forward")
    setAnimating(true)
    setTimeout(async () => {
      if (step < totalSteps - 1) {
        setStep(step + 1)
      } else {
        await sendToDiscord()
        setSubmitted(true)
      }
      setAnimating(false)
    }, 300)
  }

  const goBack = () => {
    if (step === 0 || animating) return
    setDirection("backward")
    setAnimating(true)
    setTimeout(() => {
      setStep(step - 1)
      setAnimating(false)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step !== 3 && step !== 4) {
      e.preventDefault()
      goNext()
    }
  }

  const isIneligible = formData.budget === "500"
  const isEligible = formData.budget === "above-1000" || formData.budget === "above-2000"

  const starterFeatures = [
    t('feature1'),
    t('feature2'),
    t('feature3'),
    t('feature4'),
  ]

  if (submitted) {
    if (isIneligible) {
      return (
        <section id="enrollment" className="px-4 py-20">
          <div className="mx-auto max-w-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <AlertTriangle className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
                {t('thankYou', { name: formData.fullName })}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t('ineligibleMessage')}{" "}
                <span className="font-bold text-[hsl(210,60%,50%)]">{t('advancedCourse')}</span>{" "}
                {t('ineligibleMessageEnd')}
              </p>
            </div>

            <Card className="relative border-[hsl(210,60%,50%)]/30 bg-card">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(210,60%,50%)] px-4 py-1 text-xs font-bold text-foreground">
                {t('starter')}
              </div>
              <CardContent className="pt-8 pb-6">
                <div className="mb-6 text-center">
                  <h3 className="text-2xl font-bold text-foreground">{t('courseTitle')}</h3>
                  <div className="mt-3 flex items-baseline justify-center gap-2">
                    <span className="text-lg text-muted-foreground line-through">$500</span>
                    <span className="text-5xl font-bold text-[hsl(210,60%,50%)]">$379</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t('oneTimePayment')}</p>
                </div>

                <ul className="mb-6 space-y-3">
                  {starterFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                      <Check className="h-4 w-4 shrink-0 text-[hsl(210,60%,50%)]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-3">
                  <WhopPayButton
                    plan="starter"
                    prefillEmail={formData.email}
                    className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground"
                  />
                  <NowPaymentsButton
                    plan="starter"
                    prefillEmail={formData.email}
                    className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground"
                  />
                  <OKXPayButton
                    plan="starter"
                    prefillEmail={formData.email}
                    className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="mt-10">
              <EgyptPayment />
            </div>
          </div>
        </section>
      )
    }

    if (isEligible) {
      return (
        <section id="enrollment" className="px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <Card className="overflow-hidden border-border bg-card">
              <CardContent className="p-0">
                <div className="flex flex-col items-center p-6 pb-4 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
                    {t('eligibleTitle', { name: formData.fullName })}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('eligibleSubtitle')}
                  </p>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://calendly.com/eslaamelsawi/onboarding"
                    title="Book a Meeting"
                    className="h-[700px] w-full border-0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )
    }
  }

  const progressWidth = ((step + 1) / totalSteps) * 100

  return (
    <section id="enrollment" className="px-4 py-20">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
            {t('pageTitle')} <span className="text-primary">{t('pageTitleHighlight')}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('pageSubtitle')}
          </p>
        </div>

        <Card className="overflow-hidden border-border bg-card">
          {/* Progress bar */}
          <div className="h-1 w-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressWidth}%` }}
            />
          </div>

          <CardContent className="p-6 sm:p-8">
            {/* Step counter */}
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('questionCounter', { current: step + 1, total: totalSteps })}
              </span>
              <span className="text-xs font-medium text-primary">
                {t('progressComplete', { percent: Math.round(progressWidth) })}
              </span>
            </div>

            {/* Question area */}
            <div
              className={`transition-all duration-300 ${
                animating
                  ? direction === "forward"
                    ? "-translate-x-4 opacity-0"
                    : "translate-x-4 opacity-0"
                  : "translate-x-0 opacity-100"
              }`}
            >
              {step === 0 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question1')}
                  </label>
                  <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    placeholder={t('question1Placeholder')}
                    value={formData.fullName}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === "" || /^[a-zA-Z\u0600-\u06FF\s]*$/.test(val)) {
                        setFormData({ ...formData, fullName: val })
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className="h-12 border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('question1Helper')}
                  </p>
                </div>
              )}

              {step === 1 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question2')}
                  </label>
                  <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="email"
                    placeholder={t('question2Placeholder')}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    onKeyDown={handleKeyDown}
                    className="h-12 border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                  {formData.email.trim().length > 0 && !isValidEmail(formData.email) && (
                    <p className="mt-2 text-xs text-destructive">
                      {t('question2Error')}
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question3')}
                  </label>
                  <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="number"
                    placeholder={t('question3Placeholder')}
                    value={formData.age}
                    maxLength={2}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2)
                      setFormData({ ...formData, age: val })
                    }}
                    onKeyDown={handleKeyDown}
                    className="h-12 border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question4')}
                  </label>
                  <Textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    placeholder={t('question4Placeholder')}
                    value={formData.ambitions}
                    onChange={(e) =>
                      setFormData({ ...formData, ambitions: e.target.value })
                    }
                    className="min-h-[120px] resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              )}

              {step === 4 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question5')}
                  </label>
                  <Textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    placeholder={t('question5Placeholder')}
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({ ...formData, experience: e.target.value })
                    }
                    className="min-h-[120px] resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              )}

              {step === 5 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question6')}
                  </label>
                  <div className="flex flex-col gap-3">
                    {BUDGET_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, budget: option.value })
                        }
                        className={`flex h-14 items-center rounded-lg border px-5 text-left text-base font-medium transition-all ${
                          formData.budget === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span
                          className={`mr-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            formData.budget === option.value
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {formData.budget === option.value && (
                            <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                          )}
                        </span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div>
                  <label className="mb-4 block text-lg font-semibold text-foreground">
                    {t('question7')}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.countryCode}
                      onChange={(e) =>
                        setFormData({ ...formData, countryCode: e.target.value })
                      }
                      className="h-12 w-[130px] shrink-0 rounded-lg border border-border bg-secondary px-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code + c.country} value={c.code}>
                          {c.flag} {c.country} {c.code}
                        </option>
                      ))}
                    </select>
                    <Input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={t('question7Placeholder')}
                      value={formData.whatsapp}
                      maxLength={11}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "")
                        if (val.length <= 11) {
                          setFormData({ ...formData, whatsapp: val })
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      className="h-12 border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  {formData.whatsapp.length > 0 && formData.whatsapp.length < 10 && (
                    <p className="mt-2 text-xs text-destructive">
                      {t('question7Error')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={step === 0}
                className="gap-1 bg-transparent text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('back')}
              </Button>

              <Button
                onClick={goNext}
                disabled={!canProceed()}
                className="gap-1 text-base disabled:opacity-30"
              >
                {step === totalSteps - 1 ? t('submit') : t('next')}
                {step < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

