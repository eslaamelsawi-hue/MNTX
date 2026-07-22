import "server-only"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import type { Course, Section, Lesson } from "@/lib/course-types"

/**
 * File-backed course content store (localhost-ready, zero setup). Holds the full
 * academy: courses -> sections -> lessons. Seeds itself with the SMC course on
 * first read. Production persistence can move to Supabase later without changing
 * callers.
 */

const FILE = path.join(process.cwd(), "data", "course-content.json")

const uid = () => crypto.randomUUID().slice(0, 8)

function seed(): Course[] {
  return [
    {
      id: uid(),
      slug: "smc",
      titleEn: "ADVANCED SMC Course",
      titleAr: "دورة SMC المتقدمة",
      subtitleEn: "Smart Money Concepts from the ground up — structure, liquidity, and execution.",
      subtitleAr: "مفاهيم المال الذكي من الصفر — الهيكل، السيولة، والتنفيذ.",
      accessPlans: ["mntx-elite", "starter"],
      published: true,
      sections: [
        {
          id: uid(),
          titleEn: "Getting Started",
          titleAr: "البداية",
          lessons: [
            { id: uid(), titleEn: "1. Introduction & Market Structure", titleAr: "١. مقدمة وهيكل السوق", duration: "05:20", video: "lesson-1.mp4", freePreview: true },
            { id: uid(), titleEn: "2. Liquidity & Order Blocks", titleAr: "٢. السيولة وكتل الأوامر", duration: "12:40", video: "lesson-2.mp4", freePreview: false },
            { id: uid(), titleEn: "3. Entries, Stops & Execution", titleAr: "٣. الدخول، الوقف، والتنفيذ", duration: "18:05", video: "lesson-3.mp4", freePreview: false },
          ],
        },
      ],
    },
  ]
}

function read(): Course[] {
  try {
    const raw = fs.readFileSync(FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.courses)) return parsed.courses as Course[]
  } catch {
    /* missing or invalid — seed below */
  }
  const seeded = seed()
  write(seeded)
  return seeded
}

function write(courses: Course[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify({ courses }, null, 2))
}

/* ---------------- queries ---------------- */

export function listCourses(opts?: { publishedOnly?: boolean }): Course[] {
  const courses = read()
  return opts?.publishedOnly ? courses.filter((c) => c.published) : courses
}

export function getCourse(slug: string): Course | undefined {
  return read().find((c) => c.slug === slug)
}

export function getCourseById(id: string): Course | undefined {
  return read().find((c) => c.id === id)
}

export function findLesson(lessonId: string): { course: Course; section: Section; lesson: Lesson } | undefined {
  for (const course of read()) {
    for (const section of course.sections) {
      const lesson = section.lessons.find((l) => l.id === lessonId)
      if (lesson) return { course, section, lesson }
    }
  }
  return undefined
}

/* ---------------- course mutations ---------------- */

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || uid()
}

export function createCourse(input: Partial<Course>): Course {
  const courses = read()
  let slug = input.slug ? slugify(input.slug) : slugify(input.titleEn || "course")
  while (courses.some((c) => c.slug === slug)) slug = `${slug}-${uid().slice(0, 3)}`
  const course: Course = {
    id: uid(),
    slug,
    titleEn: input.titleEn || "New Course",
    titleAr: input.titleAr || "دورة جديدة",
    subtitleEn: input.subtitleEn || "",
    subtitleAr: input.subtitleAr || "",
    accessPlans: input.accessPlans?.length ? input.accessPlans : ["mntx-elite"],
    published: input.published ?? false,
    sections: [],
  }
  courses.push(course)
  write(courses)
  return course
}

export function updateCourse(id: string, patch: Partial<Course>): Course | undefined {
  const courses = read()
  const c = courses.find((x) => x.id === id)
  if (!c) return undefined
  const fields: (keyof Course)[] = ["titleEn", "titleAr", "subtitleEn", "subtitleAr", "accessPlans", "published"]
  for (const f of fields) if (f in patch) (c as Record<string, unknown>)[f] = patch[f]
  if (patch.slug) c.slug = slugify(patch.slug)
  write(courses)
  return c
}

export function deleteCourse(id: string): boolean {
  const courses = read()
  const next = courses.filter((c) => c.id !== id)
  if (next.length === courses.length) return false
  write(next)
  return true
}

/* ---------------- section mutations ---------------- */

export function addSection(courseId: string, input: Partial<Section>): Section | undefined {
  const courses = read()
  const c = courses.find((x) => x.id === courseId)
  if (!c) return undefined
  const section: Section = { id: uid(), titleEn: input.titleEn || "New Section", titleAr: input.titleAr || "قسم جديد", lessons: [] }
  c.sections.push(section)
  write(courses)
  return section
}

export function updateSection(courseId: string, sectionId: string, patch: Partial<Section>): boolean {
  const courses = read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return false
  if (patch.titleEn != null) s.titleEn = patch.titleEn
  if (patch.titleAr != null) s.titleAr = patch.titleAr
  write(courses)
  return true
}

export function deleteSection(courseId: string, sectionId: string): boolean {
  const courses = read()
  const c = courses.find((x) => x.id === courseId)
  if (!c) return false
  const before = c.sections.length
  c.sections = c.sections.filter((s) => s.id !== sectionId)
  if (c.sections.length === before) return false
  write(courses)
  return true
}

/* ---------------- lesson mutations ---------------- */

export function addLesson(courseId: string, sectionId: string, input: Partial<Lesson>): Lesson | undefined {
  const courses = read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return undefined
  const lesson: Lesson = {
    id: uid(),
    titleEn: input.titleEn || "New Lesson",
    titleAr: input.titleAr || "درس جديد",
    duration: input.duration || "00:00",
    video: input.video || "",
    freePreview: input.freePreview ?? false,
  }
  s.lessons.push(lesson)
  write(courses)
  return lesson
}

export function updateLesson(courseId: string, sectionId: string, lessonId: string, patch: Partial<Lesson>): boolean {
  const courses = read()
  const l = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)?.lessons.find((x) => x.id === lessonId)
  if (!l) return false
  const fields: (keyof Lesson)[] = ["titleEn", "titleAr", "duration", "video", "freePreview"]
  for (const f of fields) if (f in patch) (l as Record<string, unknown>)[f] = patch[f]
  write(courses)
  return true
}

export function deleteLesson(courseId: string, sectionId: string, lessonId: string): boolean {
  const courses = read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return false
  const before = s.lessons.length
  s.lessons = s.lessons.filter((l) => l.id !== lessonId)
  if (s.lessons.length === before) return false
  write(courses)
  return true
}

/* ---------------- reordering ---------------- */

export function reorderSections(courseId: string, orderedIds: string[]): boolean {
  const courses = read()
  const c = courses.find((x) => x.id === courseId)
  if (!c) return false
  c.sections.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id))
  write(courses)
  return true
}

export function reorderLessons(courseId: string, sectionId: string, orderedIds: string[]): boolean {
  const courses = read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return false
  s.lessons.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id))
  write(courses)
  return true
}
