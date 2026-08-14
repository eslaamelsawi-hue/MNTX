"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Lock, PlayCircle, GraduationCap, Loader2, Crown, ListVideo, Layers, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CoursePlayer } from "@/components/course/course-player"
import { coverGradient } from "@/lib/course-types"

type Lesson = { id: string; titleEn: string; titleAr: string; duration: string; freePreview: boolean; descriptionEn?: string; descriptionAr?: string }
type Section = { id: string; titleEn: string; titleAr: string; lessons: Lesson[] }
type Course = { id: string; slug: string; titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; sections: Section[] }
type Cat = { id: string; slug: string; titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; lessons: number; sections: number }

/** All of the member's courses. Pick one to open it; go back to switch. */
export function DashboardAcademy({ email }: { email: string }) {
  const t = useTranslations("course")
  const locale = useLocale()
  const isAr = locale === "ar"
  const router = useRouter()

  const [cats, setCats] = useState<Cat[] | null>(null)
  const [slug, setSlug] = useState<string | null>(null) // null = show course list
  const [course, setCourse] = useState<Course | null>(null)
  const [access, setAccess] = useState<boolean | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    fetch("/api/course/catalog")
      .then((r) => r.json())
      .then((d: { courses: Cat[] }) => setCats(d.courses ?? []))
      .catch(() => setCats([]))
    fetch("/api/course/access", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setAccess(!!d.access))
      .catch(() => setAccess(false))
  }, [])

  useEffect(() => {
    if (!slug) {
      setCourse(null)
      setLessonId(null)
      return
    }
    setCourse(null)
    fetch(`/api/course/${slug}`)
      .then((r) => (r.ok ? r.json() : { course: null }))
      .then((d: { course: Course | null }) => {
        setCourse(d.course)
        setLessonId(d.course?.sections.flatMap((s) => s.lessons)[0]?.id ?? null)
      })
      .catch(() => setCourse(null))
  }, [slug])

  const flat = useMemo(() => (course ? course.sections.flatMap((s) => s.lessons) : []), [course])
  const current = flat.find((l) => l.id === lessonId) ?? flat[0] ?? null
  const unlocked = access === true
  const canPlay = !!current && (unlocked || current.freePreview)

  async function handleSubscribe() {
    setSubscribing(true)
    try {
      const res = await fetch("/api/course/subscribe", { method: "POST" })
      const data = await res.json().catch(() => ({ access: false }))
      if (data.access) {
        setAccess(true)
      } else {
        router.push("/checkout?plan=coaching")
      }
    } finally {
      setSubscribing(false)
    }
  }

  if (cats === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (cats.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{t("browseEmpty")}</p>
  }

  const accessBanner = !unlocked && access !== null && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <p className="inline-flex items-center gap-2 text-sm text-yellow-200">
        <Crown className="h-4 w-4" /> {t("noAccessDesc")}
      </p>
      <Button size="sm" disabled={subscribing} onClick={handleSubscribe}>
        {subscribing ? t("subscribing") : t("subscribeCta")}
      </Button>
    </div>
  )

  // ── Course list ──
  if (!slug) {
    return (
      <div className="space-y-6">
        {accessBanner}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("myCourses")} · {cats.length}
          </h3>
          <div className="flex flex-wrap gap-4">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setSlug(c.slug)}
                className="group w-full overflow-hidden rounded-xl border border-border text-start transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 sm:w-72"
              >
                <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${coverGradient(c.slug)}`}>
                  <GraduationCap className="h-9 w-9 text-primary/70 transition-transform group-hover:scale-110" />
                  {!unlocked && (
                    <span className="absolute end-2 top-2 rounded-md bg-black/40 p-1 text-white/70">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="bg-card p-4">
                  <p className="truncate font-semibold text-foreground">{isAr ? c.titleAr : c.titleEn}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" /> {c.lessons} {t("lessons")}</span>
                    <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {c.sections} {t("sectionsLabel")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Single course view ──
  return (
    <div className="space-y-4 lg:max-w-[90%]">
      <button
        onClick={() => setSlug(null)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToCourses")}
      </button>

      {!course ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          <h3 className="mb-4 text-xl font-bold text-foreground">{isAr ? course.titleAr : course.titleEn}</h3>
          {accessBanner && <div className="mb-4">{accessBanner}</div>}
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* Player */}
            <div className="min-w-0">
              {canPlay && current ? (
                <>
                  <CoursePlayer lesson={{ id: current.id }} email={email} />
                  <h4 className="mt-3 text-base font-semibold text-foreground">{isAr ? current.titleAr : current.titleEn}</h4>
                  {(isAr ? current.descriptionAr : current.descriptionEn) && (
                    <div className="mt-3 rounded-lg border border-border bg-card p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("lessonNotes")}</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{isAr ? current.descriptionAr : current.descriptionEn}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">{t("lessonLockedTitle")}</p>
                  <p className="max-w-xs text-sm text-muted-foreground">{t("lessonLockedDesc")}</p>
                </div>
              )}
            </div>

            {/* Curriculum */}
            <aside className="lg:h-fit">
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
                  <ListVideo className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{t("curriculum")}</span>
                  <span className="ms-auto text-xs text-muted-foreground">{flat.length} {t("lessons")}</span>
                </div>
                <div className="max-h-[55vh] overflow-y-auto">
                  {course.sections.map((section) => (
                    <div key={section.id}>
                      <p className="bg-muted/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {isAr ? section.titleAr : section.titleEn}
                      </p>
                      {section.lessons.map((l) => {
                        const activeL = l.id === (current?.id ?? "")
                        const playable = unlocked || l.freePreview
                        return (
                          <button
                            key={l.id}
                            onClick={() => playable && setLessonId(l.id)}
                            disabled={!playable}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors ${
                              activeL ? "bg-primary/10" : playable ? "hover:bg-muted/30" : "cursor-not-allowed opacity-70"
                            }`}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${activeL ? "bg-primary text-primary-foreground" : playable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {playable ? <PlayCircle className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                            </div>
                            <span className={`min-w-0 flex-1 truncate ${activeL ? "font-medium text-foreground" : playable ? "text-foreground" : "text-muted-foreground"}`}>
                              {isAr ? l.titleAr : l.titleEn}
                            </span>
                            {l.freePreview && !unlocked && (
                              <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">{t("preview")}</Badge>
                            )}
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{l.duration}</span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
