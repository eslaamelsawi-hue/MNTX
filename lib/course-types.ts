/** Shared, client-safe course types (no server-only imports). */

export type Lesson = {
  id: string
  titleEn: string
  titleAr: string
  duration: string
  /** video filename in private-media/course/ (or a storage key) */
  video: string
  freePreview: boolean
  /** Optional notes/description shown below the video player. */
  descriptionEn?: string
  descriptionAr?: string
}

export type Section = {
  id: string
  titleEn: string
  titleAr: string
  lessons: Lesson[]
}

export type Course = {
  id: string
  slug: string
  titleEn: string
  titleAr: string
  subtitleEn: string
  subtitleAr: string
  /** plans/grants that unlock this course */
  accessPlans: string[]
  published: boolean
  sections: Section[]
}

export function lessonCount(course: Course): number {
  return course.sections.reduce((n, s) => n + s.lessons.length, 0)
}

export function localized<T extends { titleEn: string; titleAr: string }>(item: T, isAr: boolean): string {
  return isAr ? item.titleAr : item.titleEn
}

/** Parse "mm:ss" or "hh:mm:ss" into seconds. */
export function durationToSeconds(d: string): number {
  const parts = (d || "").split(":").map((p) => parseInt(p, 10))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

/** Compact total like "1h 12m" or "48m". */
export function formatTotal(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm ? `${h}h ${mm}m` : `${h}h`
}

/** Deterministic brand-aligned cover gradient for a course, keyed by a seed. */
export function coverGradient(seed: string): string {
  const palettes = [
    "from-amber-500/25 via-primary/10 to-background",
    "from-violet-500/25 via-primary/10 to-background",
    "from-emerald-500/20 via-primary/10 to-background",
    "from-sky-500/25 via-primary/10 to-background",
    "from-rose-500/20 via-primary/10 to-background",
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palettes[hash % palettes.length]
}
