import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listCourses } from "@/lib/course-store"
import { lessonCount } from "@/lib/course-types"
import { hasCourseAccess } from "@/lib/course-access"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? null

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
