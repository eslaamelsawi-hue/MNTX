"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Video, PlayCircle, Loader2, Lock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CoursePlayer } from "@/components/course/course-player"

type Recording = { id: string; title: string; created_at: string }

export function DashboardRecordings({ email, hideWhenEmpty = false }: { email: string; hideWhenEmpty?: boolean }) {
  const t = useTranslations("recordings")
  const [recordings, setRecordings] = useState<Recording[] | null>(null)
  const [selected, setSelected] = useState<Recording | null>(null)

  useEffect(() => {
    fetch("/api/recordings")
      .then((r) => (r.ok ? r.json() : { recordings: [] }))
      .then((d) => setRecordings(d.recordings ?? []))
      .catch(() => setRecordings([]))
  }, [])

  // In "hideWhenEmpty" mode (e.g. course-only members' home) render nothing
  // until we know there's at least one recording to show.
  if (hideWhenEmpty && (recordings === null || recordings.length === 0)) {
    return null
  }

  const header = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Video className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("title")}</h2>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> {t("subtitle")}
        </p>
      </div>
    </div>
  )

  // Selected: show only the protected player + a back button.
  if (selected) {
    return (
      <div className="space-y-4 lg:max-w-[90%]">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{selected.title}</h2>
          <p className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</p>
        </div>
        <CoursePlayer lesson={{ id: selected.id }} email={email} src={`/api/recordings/${selected.id}/stream`} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {header}

      {recordings === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Video className="mb-3 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="max-w-sm text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recordings.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-start transition-colors hover:border-primary/40"
            >
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/15 to-transparent">
                <PlayCircle className="h-10 w-10 text-primary/70 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  <PlayCircle className="h-4 w-4" /> {t("watch")}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
