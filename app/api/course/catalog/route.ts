import { NextResponse } from "next/server"
import { listCourses } from "@/lib/course-store"
import { lessonCount } from "@/lib/course-types"

export const runtime = "nodejs"

export async function GET() {
  const courses = (await listCourses({ publishedOnly: true })).map((c) => ({
    id: c.id,
    slug: c.slug,
    titleEn: c.titleEn,
    titleAr: c.titleAr,
    subtitleEn: c.subtitleEn,
    subtitleAr: c.subtitleAr,
    lessons: lessonCount(c),
    sections: c.sections.length,
  }))
  return NextResponse.json({ courses })
}
