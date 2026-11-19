import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listCourses } from "@/lib/course-store"
import { lessonCount } from "@/lib/course-types"
import { hasCourseAccess } from "@/lib/course-access"
import { getViewerEmail } from "@/lib/admin-view"

export const runtime = "nodejs"

export async function GET() {
  const viewerEmail = await getViewerEmail()
  const email = viewerEmail

  const courses = await listCourses({ publishedOnly: true })
  const result = await Promise.all(
    courses.map(async (c) => ({
      id: c.id,
      slug: c.slug,
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      subtitleEn: c.subtitleEn,
      subtitleAr: c.subtitleAr,
      lessons: lessonCount(c),
      sections: c.sections.length,
      hasAccess: email ? await hasCourseAccess(email, c.id) : false,
    }))
  )
  return NextResponse.json({ courses: result })
}
