"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { EyeOff } from "lucide-react"

/**
 * Protected video player.
 *
 * IMPORTANT: a browser cannot truly block OS screenshots / screen recording.
 * The real protection here is the *dynamic watermark* (the viewer's email is
 * burned over the video, so any leak is traceable to that account) plus an
 * access-gated, non-downloadable stream. The focus/keyboard handling below is
 * deterrence only. Hard blocking of screen capture requires DRM (VdoCipher/Mux).
 */
export function CoursePlayer({
  lesson,
  email,
  src,
}: {
  lesson: { id: string }
  email: string
  /** Override the stream URL (e.g. private recordings). Defaults to the course video endpoint. */
  src?: string
}) {
  const t = useTranslations("course")
  const videoSrc = src ?? `/api/course/video/${lesson.id}`
  const videoRef = useRef<HTMLVideoElement>(null)
  const [pos, setPos] = useState<{ top: string; left: string }>({ top: "10%", left: "10%" })
  const [obscured, setObscured] = useState(false)
  const [stampTime, setStampTime] = useState("")

  const stamp = email || "preview"

  // Move the watermark + refresh its timestamp so screenshots are traceable in time.
  useEffect(() => {
    const tick = () => {
      setPos({ top: `${8 + Math.random() * 76}%`, left: `${6 + Math.random() * 58}%` })
      setStampTime(new Date().toLocaleString())
    }
    tick()
    const iv = setInterval(tick, 3000)
    return () => clearInterval(iv)
  }, [])

  // Black out + pause whenever the tab is hidden OR the window loses focus
  // (catches many screen-recorders / screenshot tools that steal focus).
  useEffect(() => {
    const hide = () => {
      videoRef.current?.pause()
      setObscured(true)
    }
    const show = () => setObscured(false)
    const onVis = () => (document.hidden ? hide() : show())
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("blur", hide)
    window.addEventListener("focus", show)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("blur", hide)
      window.removeEventListener("focus", show)
    }
  }, [])

  // Deter capture/save shortcuts; wipe the clipboard on PrintScreen.
  useEffect(() => {
    const wipe = () => {
      navigator.clipboard?.writeText("").catch(() => {})
      setObscured(true)
      setTimeout(() => setObscured(false), 1000)
    }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      if (k === "PrintScreen") wipe()
      const meta = e.ctrlKey || e.metaKey
      if (meta && ["s", "u", "p"].includes(k.toLowerCase())) e.preventDefault()
      if (k === "F12") e.preventDefault()
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c", "s"].includes(k.toLowerCase())) e.preventDefault()
      // Windows Snipping Tool (Win+Shift+S) can't be blocked, but wipe on Shift+S combos.
      if (e.shiftKey && e.metaKey && k.toLowerCase() === "s") wipe()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", (e) => e.key === "PrintScreen" && wipe())
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const noDrag = (e: React.SyntheticEvent) => e.preventDefault()

  return (
    <div
      className="relative select-none overflow-hidden rounded-xl border border-border bg-black"
      onContextMenu={noDrag}
      onDragStart={noDrag}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <video
        ref={videoRef}
        className="pointer-events-auto aspect-video w-full bg-black"
        src={videoSrc}
        controls
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        playsInline
        draggable={false}
        onContextMenu={noDrag}
      />

      {/* Faint tiled watermark — hard to crop out */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.07]">
        <div className="absolute inset-[-25%] flex flex-wrap gap-x-12 gap-y-8 rotate-[-20deg]">
          {Array.from({ length: 90 }).map((_, i) => (
            <span key={i} className="whitespace-nowrap text-xs font-semibold text-white">
              {stamp}
            </span>
          ))}
        </div>
      </div>

      {/* Bright moving watermark with email + timestamp */}
      <div
        className="pointer-events-none absolute z-10 rounded bg-black/35 px-2 py-1 text-[11px] font-medium leading-tight text-white/80 backdrop-blur-[1px] transition-all duration-700 ease-in-out"
        style={{ top: pos.top, left: pos.left }}
      >
        <div>{stamp}</div>
        <div className="text-[9px] text-white/60">{stampTime}</div>
      </div>

      {/* Corner watermark — always visible */}
      <div className="pointer-events-none absolute bottom-11 end-3 z-10 rounded bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/60">
        {stamp}
      </div>

      {/* Black-out overlay when hidden / focus lost / print-screen */}
      {obscured && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black text-center">
          <EyeOff className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-foreground">{t("pausedTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("pausedResume")}</p>
        </div>
      )}
    </div>
  )
}
