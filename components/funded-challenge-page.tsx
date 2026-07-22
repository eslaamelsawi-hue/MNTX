"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LineChart,
  MessageSquare,
  Radio,
  ShieldCheck,
  Target,
  X,
} from "lucide-react"
import { OKXPayButton, NowPaymentsButton } from "@/components/payment-buttons"
import { WaitlistForm } from "@/components/waitlist-form"

const certificates = [
  { id: 19, src: "/certs/cert-19.png", alt: "Certificate - 2026" },
  { id: 17, src: "/certs/cert-17.png", alt: "Certificate - 2026" },
  { id: 18, src: "/certs/cert-18.png", alt: "Certificate - 2026" },
  { id: 15, src: "/certs/cert-15.png", alt: "Alpha Capital - Lifetime Payout $22,213.00 - Mar 2026" },
  { id: 16, src: "/certs/cert-16.jpg", alt: "Lucid Trading - Payout Certificate - May 2026" },
  { id: 14, src: "/certs/cert-14.png", alt: "Certificate - Apr 2026" },
  { id: 13, src: "/certs/cert-13.png", alt: "My Funded Futures - Flex 25K Challenge Passed - Mar 2026" },
  { id: 1, src: "/certs/cert-1.png", alt: "Alpha Capital Group - Stage 1 Passed - Apr 2025" },
  { id: 2, src: "/certs/cert-6.png", alt: "Alpha Capital Group - Certified Funded Trader - Apr 2025" },
  { id: 3, src: "/certs/cert-2.png", alt: "Alpha Capital - Payout $1,026 - May 2025" },
  { id: 4, src: "/certs/cert-4.png", alt: "Alpha Capital - Payout $1,110 - May 2025" },
  { id: 5, src: "/certs/cert-3.png", alt: "Alpha Capital - Payout $8,810 - Dec 2025" },
  { id: 6, src: "/certs/cert-5.png", alt: "Alpha Capital - Passed Verification - Jan 2026" },
  { id: 9, src: "/certs/cert-9.png", alt: "Maven Trading Group - Certificate of Completion" },
  { id: 10, src: "/certs/cert-10.png", alt: "Maven Trading Group - Funded Trader Certificate" },
  { id: 11, src: "/certs/cert-11.png", alt: "Alpha Capital - Payout $1,604 - Jun 2025" },
  { id: 12, src: "/certs/cert-12.png", alt: "Alpha Capital - Phase 2 Achievement - Apr 2025" },
]

const FEATURE_ICONS = [Target, BarChart3, ShieldCheck, MessageSquare, Radio, LineChart]

function CertGallery() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / certificates.length
    const index = Math.round(el.scrollLeft / cardWidth)
    setActiveIndex(Math.min(index, certificates.length - 1))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateActiveIndex, { passive: true })
    return () => el.removeEventListener("scroll", updateActiveIndex)
  }, [updateActiveIndex])

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft ?? 0))
    setScrollLeft(scrollRef.current?.scrollLeft ?? 0)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  function handleMouseUp() { setIsDragging(false) }

  function scrollTo(direction: "left" | "right") {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / certificates.length
    el.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" })
  }

  function scrollToIndex(index: number) {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / certificates.length
    el.scrollTo({ left: cardWidth * index, behavior: "smooth" })
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex gap-4 overflow-x-auto scroll-smooth pb-4 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}
        >
          {certificates.map((cert, i) => (
            <div
              key={cert.id}
              className="flex-shrink-0"
              style={{ width: "calc(50% - 8px)", scrollSnapAlign: "start" }}
            >
              <div
                onClick={() => { if (!isDragging) setLightboxIndex(i) }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-[0_0_40px_rgba(234,179,8,0.04)] transition-all hover:shadow-[0_0_60px_rgba(234,179,8,0.08)] hover:border-primary/30"
              >
                <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                  <Image
                    src={cert.src}
                    alt={cert.alt}
                    fill
                    className="object-contain p-2 pointer-events-none"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={75}
                    {...(i < 2 ? { priority: true } : { loading: "lazy" })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTo("left")}
          className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollTo("right")}
          className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {certificates.map((cert, i) => (
          <button
            key={cert.id}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"}`}
            aria-label={`Go to certificate ${i + 1}`}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : certificates.length - 1) }}
            className="absolute left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Previous certificate"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="relative mx-16 max-h-[85vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={certificates[lightboxIndex].src}
              alt={certificates[lightboxIndex].alt}
              width={1200}
              height={900}
              className="h-auto max-h-[85vh] w-auto rounded-2xl border border-border object-contain"
              quality={85}
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null && prev < certificates.length - 1 ? prev + 1 : 0) }}
            className="absolute right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Next certificate"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            {lightboxIndex + 1} / {certificates.length}
          </div>
        </div>
      )}
    </div>
  )
}

export function FundedChallengePage() {
  const t = useTranslations("fundedChallenge")
  const tw = useTranslations("waitlist")
  const features = t.raw("features") as Array<{ title: string; description: string }>
  const includeItems = t.raw("includeItems") as string[]
  const masterItems = t.raw("masterItems") as string[]

  return (
    <div className="relative">
      {/* Full-page Enrollment Closed Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/95 py-10 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <X className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">Enrollment Closed</h1>
          <p className="mb-6 text-sm text-muted-foreground">{tw("subtitle")}</p>

          <div className="rounded-2xl border border-border bg-card p-6 text-start shadow-xl">
            <p className="mb-4 text-center text-base font-semibold text-foreground">{tw("heading")}</p>
            <WaitlistForm source="propfirm" />
          </div>

          <a href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> {tw("backHome")}
          </a>
        </div>
      </div>

      {/* Hero */}
      <section className="relative px-4 pb-10 pt-10 text-center md:pt-12">
        <div className="mx-auto max-w-4xl">
          <Badge
            variant="outline"
            className="mb-6 animate-pulse rounded-full border-primary/30 bg-primary/10 px-5 py-2.5 text-base font-medium text-primary md:text-lg"
          >
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            {t("badge")}
          </Badge>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance">
            {t("title")}{" "}
            <span className="text-primary">{t("titleHighlight")}</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-foreground md:text-lg text-pretty">
            {t("description")}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="gap-2 text-base">
              <a href="#fc-pricing">
                {t("heroCta")} <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent text-base">
              <a href="#fc-certs">{t("heroProof")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Everything Included - Features Grid */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl text-balance">
              {t("featuresTitle")}{" "}
              <span className="text-primary">{t("featuresTitleHighlight")}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-pretty">
              {t("featuresDescription")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] || Target
              return (
                <Card
                  key={feature.title}
                  className="border-border bg-card text-center transition-colors hover:border-primary/30"
                >
                  <CardHeader>
                    <Icon className="mx-auto mb-2 h-10 w-10 text-primary" />
                    <CardTitle className="text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* What You'll Master */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              {t("masterTitle")}
            </h2>
            <p className="mx-auto max-w-md text-muted-foreground leading-relaxed">
              {t("masterSubtitle")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {masterItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/30"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section id="fc-certs" className="relative overflow-hidden bg-muted/30 px-4 py-20">
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <Badge
              variant="outline"
              className="mb-4 rounded-full border-primary/30 bg-primary/10 px-4 py-1.5"
            >
              <Award className="mr-2 inline h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t("certBadge")}
              </span>
            </Badge>
            <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
              {t("certTitle")}{" "}
              <span className="text-primary">{t("certTitleHighlight")}</span>
            </h2>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground">{t("certDescription")}</p>
          </div>
          <CertGallery />
        </div>
      </section>

      {/* Pricing Card */}
      <section id="fc-pricing" className="px-4 py-20">
        <div className="mx-auto max-w-lg">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl text-balance">
              {t("pricingTitle")}{" "}
              <span className="text-primary">{t("pricingTitleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground text-pretty">{t("pricingDescription")}</p>
          </div>

          <Card className="border-primary/30 bg-card shadow-lg">
            <CardHeader className="pb-4 text-center">
              <Badge className="mx-auto mb-4 w-fit">{t("pricingBadge")}</Badge>
              <CardTitle className="text-2xl font-bold text-foreground">{t("planName")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("planSubtitle")}</p>
              <div className="mt-4">
                <span className="text-5xl font-bold text-primary">$500</span>
                <span className="text-muted-foreground">/{t("perMonth")}</span>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="space-y-3">
                {includeItems.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-4">
              <OKXPayButton plan="funded-challenge" className="w-full" />
              <NowPaymentsButton plan="funded-challenge" className="w-full" />
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  )
}
