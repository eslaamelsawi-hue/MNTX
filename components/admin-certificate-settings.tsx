"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, Save, Award } from "lucide-react"

type Settings = {
  template_url: string | null
  image_width: number | null
  image_height: number | null
  name_x_pct: number
  name_y_pct: number
  date_x_pct: number
  date_y_pct: number
  font_size: number
  font_color: string
  font_family: string
}

const defaults: Settings = {
  template_url: null, image_width: null, image_height: null,
  name_x_pct: 50, name_y_pct: 55, date_x_pct: 50, date_y_pct: 65,
  font_size: 36, font_color: "#1a1a1a", font_family: "Georgia, serif",
}

export function AdminCertificateSettings() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<"name" | "date" | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/certificate-settings")
      const data = await res.json()
      if (data.settings) setSettings({ ...defaults, ...data.settings })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const save = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    try {
      await fetch("/api/admin/certificate-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const img = new Image()
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })

      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Upload failed")
        return
      }
      await save({ template_url: data.url, image_width: dims.w, image_height: dims.h })
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (which: "name" | "date") => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(which)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const box = previewRef.current
      if (!box) return
      const rect = box.getBoundingClientRect()
      const xPct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
      const yPct = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
      setSettings((s) => ({ ...s, [`${dragging}_x_pct`]: xPct, [`${dragging}_y_pct`]: yPct }))
    }
    const onUp = () => {
      const which = dragging
      setDragging(null)
      const current = settingsRef.current
      save({
        [`${which}_x_pct`]: current[`${which}_x_pct` as keyof Settings],
        [`${which}_y_pct`]: current[`${which}_y_pct` as keyof Settings],
      } as Partial<Settings>)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4 text-primary" /> Certificate Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {settings.template_url ? "Replace template" : "Upload template"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Upload the certificate design without a name or date on it — drag the two labels below onto the image to set exactly where the client&apos;s name and completion date should appear.
          </p>

          {settings.template_url && settings.image_width && settings.image_height && (
            <div
              ref={previewRef}
              className="relative mx-auto max-w-xl select-none overflow-hidden rounded-lg border border-border"
              style={{ aspectRatio: `${settings.image_width} / ${settings.image_height}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.template_url} alt="Certificate template" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
              <div
                onMouseDown={handleDrag("name")}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded bg-primary/90 px-2 py-1 text-xs font-bold text-primary-foreground shadow-lg"
                style={{ left: `${settings.name_x_pct}%`, top: `${settings.name_y_pct}%` }}
              >
                Name
              </div>
              <div
                onMouseDown={handleDrag("date")}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded bg-amber-500/90 px-2 py-1 text-xs font-bold text-black shadow-lg"
                style={{ left: `${settings.date_x_pct}%`, top: `${settings.date_y_pct}%` }}
              >
                Date
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Font size (name)</Label>
              <Input type="number" value={settings.font_size} onChange={(e) => save({ font_size: Number(e.target.value) })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Font color</Label>
              <Input type="color" value={settings.font_color} onChange={(e) => save({ font_color: e.target.value })} className="h-9 p-1" />
            </div>
            <div>
              <Label className="text-xs">Font family</Label>
              <Input value={settings.font_family} onChange={(e) => save({ font_family: e.target.value })} className="h-9" placeholder="Georgia, serif" />
            </div>
          </div>
          {saving && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Save className="h-3 w-3" /> Saving…</p>}
        </CardContent>
      </Card>
    </div>
  )
}
