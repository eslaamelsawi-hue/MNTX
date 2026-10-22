"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Expand, Pause, Play, X } from "lucide-react"
import { CERTIFICATES } from "@/lib/certificates"

const AUTOPLAY_MS = 4500
/** Cards further than this from the active one aren't rendered into depth. */
const VISIBLE_DEPTH = 2
const DRAG_THRESHOLD = 60

/** Shortest signed distance from `index` to `i` on a loop of `length`, so the
 *  deck wraps without the stack visibly rewinding through every card. */
function wrappedOffset(i: number, index: number, length: number): number {
  let offset = i - index
  if (offset > length / 2) offset -= length
  if (offset < -length / 2) offset += length
  return offset
}

export function CertificateCarousel() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [drag, setDrag] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const dragStart = useRef<number | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(query.matches)
    apply()
    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
  }, [])

  const total = CERTIFICATES.length
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + total) % total), [total])
  const next = useCallback(() => go(1), [go])
  const prev = useCallback(() => go(-1), [go])

  // Autoplay pauses while dragging, in the lightbox, or if the visitor
  // prefers reduced motion.
  useEffect(() => {
    if (!playing || lightbox || dragStart.current !== null || reduceMotion) return
    const timer = setTimeout(next, AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [playing, lightbox, next, index, reduceMotion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false)
      // Arabic reads right-to-left, so Left advances and Right goes back.
      if (e.key === "ArrowLeft") next()
      if (e.key === "ArrowRight") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX
    stage.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return
    setDrag(e.clientX - dragStart.current)
  }
  const onPointerUp = () => {
    if (dragStart.current === null) return
    if (drag < -DRAG_THRESHOLD) next()
    else if (drag > DRAG_THRESHOLD) prev()
    dragStart.current = null
    setDrag(0)
  }

  const active = CERTIFICATES[index]

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-6">
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-[240px] touch-pan-y select-none sm:h-[320px] md:h-[400px]"
        style={{ perspective: "1800px", perspectiveOrigin: "50% 50%" }}
      >
        {CERTIFICATES.map((cert, i) => {
          const offset = wrappedOffset(i, index, total)
          const distance = Math.abs(offset)
          const hidden = distance > VISIBLE_DEPTH

          // Forward (next) stacks toward the left, matching the RTL reading
          // direction, with each step angled further back in depth.
          const dragShift = dragStart.current !== null ? drag * 0.25 : 0
          const x = -offset * 52 + (distance === 0 ? dragShift / 6 : 0)
          const z = -distance * 170
          const rotate = reduceMotion ? 0 : offset * 36
          const scale = 1 - distance * 0.12

          return (
            <button
              key={cert.id}
              type="button"
              aria-hidden={hidden}
              tabIndex={hidden ? -1 : 0}
              aria-label={distance === 0 ? "تكبير الشهادة" : cert.alt}
              onClick={() => (distance === 0 ? setLightbox(true) : go(offset))}
              className="absolute left-1/2 top-1/2 h-full w-[76%] origin-center overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:w-[64%] md:w-[58%]"
              style={{
                transform: `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateY(${rotate}deg) scale(${scale})`,
                opacity: hidden ? 0 : 1 - distance * 0.22,
                zIndex: 10 - distance,
                pointerEvents: hidden ? "none" : "auto",
                filter: distance === 0 ? "none" : `brightness(${1 - distance * 0.25})`,
                transition:
                  dragStart.current !== null
                    ? "none"
                    : "transform 620ms cubic-bezier(.22,1,.36,1), opacity 480ms ease, filter 480ms ease",
                transformStyle: "preserve-3d",
                cursor: distance === 0 ? "zoom-in" : "pointer",
              }}
            >
              <Image
                src={cert.src}
                alt={cert.alt}
                fill
                sizes="(max-width: 768px) 76vw, 560px"
                className="object-contain p-2"
                priority={i < 3}
                draggable={false}
              />
              {distance === 0 && (
                <span className="absolute bottom-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur">
                  <Expand className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={prev}
          aria-label="السابق"
          className="absolute end-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="التالي"
          className="absolute start-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* autoplay progress — restarts on every change via the key */}
      <div className="mx-auto mt-6 h-0.5 w-40 overflow-hidden rounded-full bg-muted">
        {playing && !reduceMotion && !lightbox && (
          <div
            key={index}
            className="h-full bg-primary"
            style={{ animation: `cert-progress ${AUTOPLAY_MS}ms linear forwards` }}
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "إيقاف العرض" : "تشغيل العرض"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {CERTIFICATES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`الشهادة ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-muted hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {index + 1}/{total}
        </span>
      </div>

      <style jsx global>{`
        @keyframes cert-progress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="إغلاق"
            className="absolute end-4 top-4 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={active.src} alt={active.alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
