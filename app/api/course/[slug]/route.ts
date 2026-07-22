import { NextResponse } from "next/server"
import { getCourse } from "@/lib/course-store"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course || !course.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  // Strip the raw video filenames — the player streams via /api/course/video/[id].
  return NextResponse.json({
    course: {
      id: course.id,
      slug: course.slug,
      titleEn: course.titleEn,
      titleAr: course.titleAr,
      subtitleEn: course.subtitleEn,
      subtitleAr: course.subtitleAr,
      sections: course.sections.map((s) => ({
        id: s.id,
        titleEn: s.titleEn,
        titleAr: s.titleAr,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          titleEn: l.titleEn,
          titleAr: l.titleAr,
          duration: l.duration,
          freePreview: l.freePreview,
        })),
      })),
    },
  })
}
