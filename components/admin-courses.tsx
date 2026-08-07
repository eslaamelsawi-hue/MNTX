"use client"

import { useEffect, useRef, useState } from "react"
import {
  BookOpen, Plus, Trash2, RefreshCw, Loader2, Upload, ChevronRight, ChevronDown, Check, Eye, EyeOff, Video,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusPill } from "@/components/status-pill"

type Lesson = { id: string; titleEn: string; titleAr: string; duration: string; video: string; freePreview: boolean }
type Section = { id: string; titleEn: string; titleAr: string; lessons: Lesson[] }
type Course = { id: string; slug: string; titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; published: boolean; sections: Section[] }

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch("/api/admin/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  })
  return res.json()
}

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [openCourse, setOpenCourse] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/courses")
      const data = await res.json()
      setCourses(data.courses ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const newCourse = async () => {
    const d = await api("createCourse", { data: { titleEn: "New Course", titleAr: "دورة جديدة" } })
    await load()
    if (d.course?.id) setOpenCourse(d.course.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" /> Courses
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={newCourse} className="gap-1.5">
            <Plus className="h-4 w-4" /> New course
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No courses yet. Create your first course.
          </CardContent>
        </Card>
      ) : (
        courses.map((course) => (
          <CourseRow
            key={course.id}
            course={course}
            open={openCourse === course.id}
            onToggle={() => setOpenCourse(openCourse === course.id ? null : course.id)}
            onChanged={load}
          />
        ))
      )}
    </div>
  )
}

function CourseRow({ course, open, onToggle, onChanged }: { course: Course; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const [c, setC] = useState(course)
  useEffect(() => setC(course), [course])
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await api("updateCourse", {
      id: c.id,
      patch: { titleEn: c.titleEn, titleAr: c.titleAr, subtitleEn: c.subtitleEn, subtitleAr: c.subtitleAr, published: c.published },
    })
    setSaving(false)
    onChanged()
  }
  const remove = async () => {
    if (!confirm(`Delete course "${c.titleEn}" and all its lessons?`)) return
    await api("deleteCourse", { id: c.id })
    onChanged()
  }
  const addSection = async () => {
    await api("addSection", { courseId: c.id, data: { titleEn: "New Section", titleAr: "قسم جديد" } })
    onChanged()
  }

  return (
    <Card>
      <CardContent className="p-0">
        <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-start">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="flex-1 font-medium text-foreground">{c.titleEn}</span>
          <StatusPill status={c.published ? "published" : "draft"} />
          <span className="text-xs text-muted-foreground">{c.sections.reduce((n, s) => n + s.lessons.length, 0)} lessons</span>
        </button>

        {open && (
          <div className="space-y-5 border-t border-border p-4">
            {/* Course fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title (EN)" value={c.titleEn} onChange={(v) => setC({ ...c, titleEn: v })} />
              <Field label="Title (AR)" value={c.titleAr} onChange={(v) => setC({ ...c, titleAr: v })} />
              <Field label="Subtitle (EN)" value={c.subtitleEn} onChange={(v) => setC({ ...c, subtitleEn: v })} />
              <Field label="Subtitle (AR)" value={c.subtitleAr} onChange={(v) => setC({ ...c, subtitleAr: v })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setC({ ...c, published: !c.published })} className="gap-1.5">
                {c.published ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4" />}
                {c.published ? "Published" : "Draft"}
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save course
              </Button>
              <Button size="sm" variant="ghost" onClick={remove} className="gap-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <span className="ms-auto text-xs text-muted-foreground">/course/{c.slug}</span>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {c.sections.map((section) => (
                <SectionBlock key={section.id} courseId={c.id} section={section} onChanged={onChanged} />
              ))}
              <Button size="sm" variant="outline" onClick={addSection} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add section
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionBlock({ courseId, section, onChanged }: { courseId: string; section: Section; onChanged: () => void }) {
  const [titleEn, setTitleEn] = useState(section.titleEn)
  const [titleAr, setTitleAr] = useState(section.titleAr)
  useEffect(() => { setTitleEn(section.titleEn); setTitleAr(section.titleAr) }, [section])

  const saveSection = async () => {
    await api("updateSection", { courseId, sectionId: section.id, patch: { titleEn, titleAr } })
    onChanged()
  }
  const removeSection = async () => {
    if (!confirm(`Delete section "${titleEn}"?`)) return
    await api("deleteSection", { courseId, sectionId: section.id })
    onChanged()
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="h-8 max-w-[200px]" placeholder="Section (EN)" />
        <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="h-8 max-w-[160px]" placeholder="القسم (AR)" dir="rtl" />
        <Button size="sm" variant="ghost" onClick={saveSection}><Check className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={removeSection} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="mt-3 space-y-2">
        {section.lessons.map((lesson) => (
          <LessonRow key={lesson.id} courseId={courseId} sectionId={section.id} lesson={lesson} onChanged={onChanged} />
        ))}
        <AddLesson courseId={courseId} sectionId={section.id} onChanged={onChanged} />
      </div>
    </div>
  )
}

function LessonRow({ courseId, sectionId, lesson, onChanged }: { courseId: string; sectionId: string; lesson: Lesson; onChanged: () => void }) {
  const [l, setL] = useState(lesson)
  useEffect(() => setL(lesson), [lesson])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const save = async (patch: Partial<Lesson>) => {
    await api("updateLesson", { courseId, sectionId, lessonId: l.id, patch })
    onChanged()
  }
  const remove = async () => {
    if (!confirm(`Delete lesson "${l.titleEn}"?`)) return
    await api("deleteLesson", { courseId, sectionId, lessonId: l.id })
    onChanged()
  }
  /**
   * PUT the file straight to Supabase Storage via a signed URL — Vercel caps
   * serverless function bodies at ~4.5MB, so routing video through our own
   * server never works past that size regardless of what it does with it.
   */
  const putWithProgress = (url: string, file: File, contentType: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", contentType)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText || "Unknown error"}`)))
      xhr.onerror = () => reject(new Error("Network error during upload — check your connection and try again."))
      xhr.send(file)
    })
  const upload = async (file: File) => {
    setUploading(true)
    setProgress(0)
    try {
      const ticketRes = await fetch("/api/admin/courses/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      })
      const ticket = await ticketRes.json().catch(() => ({}))
      if (!ticketRes.ok) { alert(ticket.error || "Could not start the upload"); return }
      await putWithProgress(ticket.signedUrl, file, ticket.contentType || file.type || "video/mp4")
      await save({ video: ticket.filename })
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
      <Input value={l.titleEn} onChange={(e) => setL({ ...l, titleEn: e.target.value })} onBlur={() => save({ titleEn: l.titleEn })} className="h-8 max-w-[190px]" placeholder="Lesson (EN)" />
      <Input value={l.titleAr} onChange={(e) => setL({ ...l, titleAr: e.target.value })} onBlur={() => save({ titleAr: l.titleAr })} className="h-8 max-w-[150px]" placeholder="الدرس (AR)" dir="rtl" />
      <Input value={l.duration} onChange={(e) => setL({ ...l, duration: e.target.value })} onBlur={() => save({ duration: l.duration })} className="h-8 w-20" placeholder="00:00" />
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input type="checkbox" checked={l.freePreview} onChange={(e) => { setL({ ...l, freePreview: e.target.checked }); save({ freePreview: e.target.checked }) }} />
        preview
      </label>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-8 gap-1.5">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? `${progress}%` : l.video ? "Replace" : "Upload"}
      </Button>
      {l.video && <Video className="h-4 w-4 text-green-400" aria-label="has video" />}
      <Button size="sm" variant="ghost" onClick={remove} className="h-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
    </div>
  )
}

function AddLesson({ courseId, sectionId, onChanged }: { courseId: string; sectionId: string; onChanged: () => void }) {
  const [title, setTitle] = useState("")
  const add = async () => {
    if (!title.trim()) return
    await api("addLesson", { courseId, sectionId, data: { titleEn: title.trim(), titleAr: title.trim() } })
    setTitle("")
    onChanged()
  }
  return (
    <div className="flex items-center gap-2 pt-1">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New lesson title…" className="h-8 max-w-[240px]" />
      <Button size="sm" variant="outline" onClick={add} className="h-8 gap-1.5"><Plus className="h-4 w-4" /> Add lesson</Button>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} dir={label.includes("AR") ? "rtl" : "ltr"} />
    </div>
  )
}
