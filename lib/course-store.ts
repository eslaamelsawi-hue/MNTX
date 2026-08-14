import "server-only"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Course, Section, Lesson } from "@/lib/course-types"

/**
 * Course content store: courses -> sections -> lessons.
 *
 * Primary store is a single JSON row in the Supabase `course_content` table
 * (id = "main", data = { courses }) so edits PERSIST on serverless hosts where
 * the filesystem is read-only. Falls back to a local JSON file for localhost,
 * and seeds the SMC course on first run.
 */

const TABLE = "course_content"
const ROW_ID = "main"
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

function readFileCourses(): Course[] | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"))
    if (Array.isArray(parsed?.courses)) return parsed.courses as Course[]
  } catch {
    /* missing / invalid */
  }
  return null
}

async function read(): Promise<Course[]> {
  // 1. Supabase (persists on serverless)
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle()
    if (error) throw error
    const courses = (data?.data as { courses?: unknown })?.courses
    if (Array.isArray(courses)) return courses as Course[]
  } catch {
    /* table missing or offline — fall back to file */
  }
  // 2. Local file (localhost)
  const fromFile = readFileCourses()
  if (fromFile) return fromFile
  // 3. Seed on first run
  const seeded = seed()
  await write(seeded)
  return seeded
}

async function write(courses: Course[]): Promise<void> {
  // Supabase — the source of truth in production.
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: { courses } }, { onConflict: "id" })
    if (error) throw error
  } catch {
    /* table missing / offline — file write below still covers localhost */
  }
  // Local file — best-effort (silently ignored on read-only serverless FS).
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify({ courses }, null, 2))
  } catch {
    /* read-only filesystem (e.g. Vercel) — Supabase holds the data there */
  }
}

/* ---------------- queries ---------------- */

export async function listCourses(opts?: { publishedOnly?: boolean }): Promise<Course[]> {
  const courses = await read()
  return opts?.publishedOnly ? courses.filter((c) => c.published) : courses
}

export async function getCourse(slug: string): Promise<Course | undefined> {
  return (await read()).find((c) => c.slug === slug)
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return (await read()).find((c) => c.id === id)
}

export async function findLesson(lessonId: string): Promise<{ course: Course; section: Section; lesson: Lesson } | undefined> {
  for (const course of await read()) {
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

export async function createCourse(input: Partial<Course>): Promise<Course> {
  const courses = await read()
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
  await write(courses)
  return course
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<Course | undefined> {
  const courses = await read()
  const c = courses.find((x) => x.id === id)
  if (!c) return undefined
  const fields: (keyof Course)[] = ["titleEn", "titleAr", "subtitleEn", "subtitleAr", "accessPlans", "published"]
  for (const f of fields) if (f in patch) (c as Record<string, unknown>)[f] = patch[f]
  if (patch.slug) c.slug = slugify(patch.slug)
  await write(courses)
  return c
}

export async function deleteCourse(id: string): Promise<boolean> {
  const courses = await read()
  const next = courses.filter((c) => c.id !== id)
  if (next.length === courses.length) return false
  await write(next)
  return true
}

/* ---------------- section mutations ---------------- */

export async function addSection(courseId: string, input: Partial<Section>): Promise<Section | undefined> {
  const courses = await read()
  const c = courses.find((x) => x.id === courseId)
  if (!c) return undefined
  const section: Section = { id: uid(), titleEn: input.titleEn || "New Section", titleAr: input.titleAr || "قسم جديد", lessons: [] }
  c.sections.push(section)
  await write(courses)
  return section
}

export async function updateSection(courseId: string, sectionId: string, patch: Partial<Section>): Promise<boolean> {
  const courses = await read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return false
  if (patch.titleEn != null) s.titleEn = patch.titleEn
  if (patch.titleAr != null) s.titleAr = patch.titleAr
  await write(courses)
  return true
}

export async function deleteSection(courseId: string, sectionId: string): Promise<boolean> {
  const courses = await read()
  const c = courses.find((x) => x.id === courseId)
  if (!c) return false
  const before = c.sections.length
  c.sections = c.sections.filter((s) => s.id !== sectionId)
  if (c.sections.length === before) return false
  await write(courses)
  return true
}

/* ---------------- lesson mutations ---------------- */

export async function addLesson(courseId: string, sectionId: string, input: Partial<Lesson>): Promise<Lesson | undefined> {
  const courses = await read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return undefined
  const lesson: Lesson = {
    id: uid(),
    titleEn: input.titleEn || "New Lesson",
    titleAr: input.titleAr || "درس جديد",
    duration: input.duration || "00:00",
    video: input.video || "",
    freePreview: input.freePreview ?? false,
    descriptionEn: input.descriptionEn || "",
    descriptionAr: input.descriptionAr || "",
  }
  s.lessons.push(lesson)
  await write(courses)
  return lesson
}

export async function updateLesson(courseId: string, sectionId: string, lessonId: string, patch: Partial<Lesson>): Promise<boolean> {
  const courses = await read()
  const l = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)?.lessons.find((x) => x.id === lessonId)
  if (!l) return false
  const fields: (keyof Lesson)[] = ["titleEn", "titleAr", "duration", "video", "freePreview", "descriptionEn", "descriptionAr"]
  for (const f of fields) if (f in patch) (l as Record<string, unknown>)[f] = patch[f]
  await write(courses)
  return true
}

export async function deleteLesson(courseId: string, sectionId: string, lessonId: string): Promise<boolean> {
  const courses = await read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return false
  const before = s.lessons.length
  s.lessons = s.lessons.filter((l) => l.id !== lessonId)
  if (s.lessons.length === before) return false
  await write(courses)
  return true
}

/* ---------------- reordering ---------------- */

export async function reorderSections(courseId: string, orderedIds: string[]): Promise<boolean> {
  const courses = await read()
  const c = courses.find((x) => x.id === courseId)
  if (!c) return false
  c.sections.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id))
  await write(courses)
  return true
}

export async function reorderLessons(courseId: string, sectionId: string, orderedIds: string[]): Promise<boolean> {
  const courses = await read()
  const s = courses.find((x) => x.id === courseId)?.sections.find((x) => x.id === sectionId)
  if (!s) return false
  s.lessons.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id))
  await write(courses)
  return true
}
