"use client"

import React from "react"

import { useRef, useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Award, X } from "lucide-react"
import Image from "next/image"
import { useTranslations } from 'next-intl'

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

export function CertificateStudio() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const t = useTranslations('certificate')

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

  function handleMouseUp() {
    setIsDragging(false)
  }

  function scrollTo(direction: "left" | "right") {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / certificates.length
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth
    el.scrollBy({ left: scrollAmount, behavior: "smooth" })
  }

  function scrollToIndex(index: number) {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / certificates.length
    el.scrollTo({ left: cardWidth * index, behavior: "smooth" })
  }

  return (
    <section className="relative py-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(43_100%_50%/0.04),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t('badge')}
            </span>
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl text-balance">
            {t('title')} <span className="text-primary">{t('titleHighlight')}</span>
          </h2>
          <p className="mx-auto max-w-lg text-base text-muted-foreground text-pretty">
            {t('description')}
          </p>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex gap-4 overflow-x-auto scroll-smooth pb-4 ${
              isDragging ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
            }}
          >
            {certificates.map((cert, i) => (
              <div
                key={cert.id}
                className="flex-shrink-0 scroll-snap-align-start"
                style={{
                  width: "calc(50% - 8px)",
                  scrollSnapAlign: "start",
                }}
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
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-border hover:bg-muted-foreground"
              }`}
              aria-label={`Go to certificate ${i + 1}`}
            />
          ))}
        </div>
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
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((prev) =>
                prev !== null && prev > 0 ? prev - 1 : certificates.length - 1
              )
            }}
            className="absolute left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Previous certificate"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            className="relative mx-16 max-h-[85vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
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
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((prev) =>
                prev !== null && prev < certificates.length - 1 ? prev + 1 : 0
              )
            }}
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
    </section>
  )
}
