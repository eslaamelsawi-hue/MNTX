"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Video,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Users,
  CalendarDays,
  TrendingUp,
  LogOut,
  FileText,
  Edit,
  Eye,
  EyeOff,
  ImageIcon,
  Tag,
} from "lucide-react"

type Slot = {
  id: string
  date: string
  start_time: string
  end_time: string
  duration: number
  is_booked: boolean
  created_at: string
}

type Booking = {
  id: string
  slot_id: string
  client_name: string
  client_email: string
  client_phone: string | null
  client_message: string | null
  duration: number
  status: string
  zoom_meeting_id: string | null
  zoom_join_url: string | null
  zoom_start_url: string | null
  created_at: string
  availability_slots: Slot
}

type GoldArticle = {
  id: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  summary_en: string
  summary_ar: string
  image_url: string
  tags: string[]
  published: boolean
  created_at: string
  updated_at: string
}

export function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null)
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string>("")

  // Gold articles state
  const [articles, setArticles] = useState<GoldArticle[]>([])
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [articleDialogOpen, setArticleDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<GoldArticle | null>(null)
  const [articleForm, setArticleForm] = useState({
    title_en: "",
    title_ar: "",
    content_en: "",
    content_ar: "",
    summary_en: "",
    summary_ar: "",
    image_url: "",
    tags: "" as string,
    published: true,
  })

  // Helper function to format date in local timezone (not UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getTodayLocal = () => formatDateLocal(new Date())

  // Add slot form
  const [newSlotDate, setNewSlotDate] = useState("")
  const [newSlotStartTime, setNewSlotStartTime] = useState("09:00")
  const [newSlotDuration, setNewSlotDuration] = useState("60")
  const [addingSlot, setAddingSlot] = useState(false)

  // Bulk slot form
  const [bulkDate, setBulkDate] = useState("")
  const [bulkStartHour, setBulkStartHour] = useState("9")
  const [bulkEndHour, setBulkEndHour] = useState("17")
  const [bulkDuration, setBulkDuration] = useState("60")
  const [addingBulk, setAddingBulk] = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch("/api/admin/bookings")
      const data = await res.json()
      if (data.bookings) setBookings(data.bookings)
    } catch (e) {
      console.error("Failed to fetch bookings:", e)
    }
    setLoadingBookings(false)
  }, [])

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch("/api/admin/slots")
      const data = await res.json()
      if (data.slots) setSlots(data.slots)
    } catch (e) {
      console.error("Failed to fetch slots:", e)
    }
    setLoadingSlots(false)
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchSlots()
    fetchArticles()
  }, [fetchBookings, fetchSlots])

  const formatTime = (time: string) => {
    const [h, m] = time.split(":")
    const hour = parseInt(h)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${m} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleAddSlot = async () => {
    if (!newSlotDate || !newSlotStartTime) return
    setAddingSlot(true)
    const dur = parseInt(newSlotDuration)
    const [h, m] = newSlotStartTime.split(":").map(Number)
    const endMinutes = h * 60 + m + dur
    const endH = Math.floor(endMinutes / 60).toString().padStart(2, "0")
    const endM = (endMinutes % 60).toString().padStart(2, "0")

    try {
      await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: [{
            date: newSlotDate,
            start_time: `${newSlotStartTime}:00`,
            end_time: `${endH}:${endM}:00`,
            duration: dur,
          }],
        }),
      })
      fetchSlots()
      setNewSlotDate("")
      setNewSlotStartTime("09:00")
    } catch (e) {
      console.error("Failed to add slot:", e)
    }
    setAddingSlot(false)
  }

  const handleBulkAdd = async () => {
    if (!bulkDate) return
    setAddingBulk(true)
    const dur = parseInt(bulkDuration)
    const startH = parseInt(bulkStartHour)
    const endH = parseInt(bulkEndHour)
    const slotsToAdd = []

    for (let h = startH; h < endH; h += dur / 60) {
      const startMinutes = Math.round(h * 60)
      const endMinutes = startMinutes + dur
      if (endMinutes > endH * 60) break

      const sH = Math.floor(startMinutes / 60).toString().padStart(2, "0")
      const sM = (startMinutes % 60).toString().padStart(2, "0")
      const eH = Math.floor(endMinutes / 60).toString().padStart(2, "0")
      const eM = (endMinutes % 60).toString().padStart(2, "0")

      slotsToAdd.push({
        date: bulkDate,
        start_time: `${sH}:${sM}:00`,
        end_time: `${eH}:${eM}:00`,
        duration: dur,
      })
    }

    try {
      await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsToAdd }),
      })
      fetchSlots()
      setBulkDate("")
    } catch (e) {
      console.error("Failed to bulk add:", e)
    }
    setAddingBulk(false)
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Delete this slot?")) return
    try {
      await fetch(`/api/admin/slots?id=${id}`, { method: "DELETE" })
      fetchSlots()
    } catch (e) {
      console.error("Failed to delete slot:", e)
    }
  }

  const handleDeleteAllSlots = async () => {
    const availableCount = slots.filter(s => !s.is_booked).length
    if (availableCount === 0) {
      alert("No available slots to delete.")
      return
    }
    if (!confirm(`Delete all ${availableCount} available slots? Booked slots will not be affected.`)) return
    try {
      await fetch("/api/admin/slots?all=true", { method: "DELETE" })
      fetchSlots()
      alert("All available slots deleted successfully.")
    } catch (e) {
      console.error("Failed to delete all slots:", e)
      alert("Failed to delete slots. Please try again.")
    }
  }

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return
    try {
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, status: newStatus }),
      })
      fetchBookings()
      fetchSlots()
    } catch (e) {
      console.error("Failed to update status:", e)
    }
  }

  const handleReschedule = async (bookingId: string) => {
    if (!rescheduleSlotId) return
    try {
      await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, new_slot_id: rescheduleSlotId }),
      })
      fetchBookings()
      fetchSlots()
      setRescheduleBookingId(null)
      setRescheduleSlotId("")
    } catch (e) {
      console.error("Failed to reschedule:", e)
    }
  }

  // ========== Gold Articles functions ==========
  const fetchArticles = async () => {
    setLoadingArticles(true)
    try {
      const res = await fetch("/api/admin/articles")
      const data = await res.json()
      if (data.articles) setArticles(data.articles)
    } catch (e) {
      console.error("Failed to fetch articles:", e)
    }
    setLoadingArticles(false)
  }

  const resetArticleForm = () => {
    setEditingArticle(null)
    setArticleForm({ title_en: "", title_ar: "", content_en: "", content_ar: "", summary_en: "", summary_ar: "", image_url: "", tags: "", published: true })
    setArticleDialogOpen(false)
  }

  const handleEditArticle = (article: GoldArticle) => {
    setEditingArticle(article)
    setArticleForm({
      title_en: article.title_en,
      title_ar: article.title_ar,
      content_en: article.content_en,
      content_ar: article.content_ar,
      summary_en: article.summary_en || "",
      summary_ar: article.summary_ar || "",
      image_url: article.image_url || "",
      tags: (article.tags || []).join(", "),
      published: article.published,
    })
    setArticleDialogOpen(true)
  }

  const handleSaveArticle = async () => {
    const payload = {
      ...articleForm,
      tags: articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
    }
    try {
      if (editingArticle) {
        await fetch("/api/admin/articles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingArticle.id, ...payload }),
        })
      } else {
        await fetch("/api/admin/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      resetArticleForm()
      fetchArticles()
    } catch (e) {
      console.error("Failed to save article:", e)
    }
  }

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return
    try {
      await fetch(`/api/admin/articles?id=${id}`, { method: "DELETE" })
      fetchArticles()
    } catch (e) {
      console.error("Failed to delete article:", e)
    }
  }

  const handleTogglePublished = async (article: GoldArticle) => {
    try {
      await fetch("/api/admin/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: article.id, published: !article.published }),
      })
      fetchArticles()
    } catch (e) {
      console.error("Failed to toggle published:", e)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "completed": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "rescheduled": return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default: return ""
    }
  }

  const confirmedCount = bookings.filter(b => b.status === "confirmed").length
  const totalSlots = slots.length
  const availableSlots = slots.filter(s => !s.is_booked).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-foreground">Mentix Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            document.cookie = "admin_session=; path=/; max-age=0"
            window.location.reload()
          }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{confirmedCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <CalendarDays className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{availableSlots}</p>
                <p className="text-sm text-muted-foreground">Available Slots</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <CalendarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSlots}</p>
                <p className="text-sm text-muted-foreground">Total Slots</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="slots">Availability</TabsTrigger>
            <TabsTrigger value="articles">Gold Articles</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">All Bookings</h2>
              <Button variant="outline" size="sm" onClick={fetchBookings}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>

            {loadingBookings ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : bookings.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No bookings yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Client</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Zoom</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id} className="border-border">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{booking.client_name}</p>
                              <p className="text-sm text-muted-foreground">{booking.client_email}</p>
                              {booking.client_phone && (
                                <p className="text-xs text-muted-foreground">{booking.client_phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {booking.availability_slots ? formatDate(booking.availability_slots.date) : "N/A"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {booking.availability_slots ? formatTime(booking.availability_slots.start_time) : "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">{booking.duration} min</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {booking.zoom_start_url ? (
                              <a
                                href={booking.zoom_start_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Video className="h-3.5 w-3.5" /> Start
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {booking.status === "confirmed" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-emerald-400 hover:text-emerald-300"
                                    onClick={() => handleStatusChange(booking.id, "completed")}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Dialog open={rescheduleBookingId === booking.id} onOpenChange={(open) => {
                                    if (!open) { setRescheduleBookingId(null); setRescheduleSlotId(""); }
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-400 hover:text-amber-300"
                                        onClick={() => setRescheduleBookingId(booking.id)}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card border-border">
                                      <DialogHeader>
                                        <DialogTitle>Reschedule Booking</DialogTitle>
                                        <DialogDescription>
                                          Select a new available slot for {booking.client_name}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <Select value={rescheduleSlotId} onValueChange={setRescheduleSlotId}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a new slot" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {slots
                                              .filter(s => !s.is_booked && s.duration === booking.duration)
                                              .map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                  {formatDate(s.date)} at {formatTime(s.start_time)} ({s.duration} min)
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          className="w-full"
                                          disabled={!rescheduleSlotId}
                                          onClick={() => handleReschedule(booking.id)}
                                        >
                                          Confirm Reschedule
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleStatusChange(booking.id, "cancelled")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="slots" className="space-y-6">
            {/* Add single slot */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add Single Slot
                </CardTitle>
                <CardDescription>Add an individual availability slot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      min={getTodayLocal()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSlotStartTime}
                      onChange={(e) => setNewSlotStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={newSlotDuration} onValueChange={setNewSlotDuration}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddSlot} disabled={addingSlot || !newSlotDate}>
                    {addingSlot ? "Adding..." : "Add Slot"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bulk add slots */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Bulk Add Slots
                </CardTitle>
                <CardDescription>Generate multiple slots for an entire day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      min={getTodayLocal()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Hour</Label>
                    <Select value={bulkStartHour} onValueChange={setBulkStartHour}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>End Hour</Label>
                    <Select value={bulkEndHour} onValueChange={setBulkEndHour}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={bulkDuration} onValueChange={setBulkDuration}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleBulkAdd} disabled={addingBulk || !bulkDate}>
                    {addingBulk ? "Adding..." : "Generate Slots"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Slots list */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">All Availability Slots</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchSlots}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteAllSlots}
                  disabled={slots.filter(s => !s.is_booked).length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Available
                </Button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : slots.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No availability slots configured.</p>
                  <p className="text-sm text-muted-foreground">Add slots above to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots.map((slot) => (
                        <TableRow key={slot.id} className="border-border">
                          <TableCell className="font-medium text-foreground">
                            {formatDate(slot.date)}
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground">{slot.duration} min</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              slot.is_booked
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            }>
                              {slot.is_booked ? "Booked" : "Available"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {!slot.is_booked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Gold Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Gold Analysis Articles</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchArticles}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Dialog open={articleDialogOpen} onOpenChange={(open) => {
                  if (!open) { resetArticleForm() }
                  setArticleDialogOpen(open)
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { resetArticleForm(); setArticleDialogOpen(true) }}>
                      <Plus className="mr-2 h-4 w-4" /> New Article
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
                      <DialogDescription>
                        {editingArticle ? "Update the article details below." : "Write your gold analysis article in English and Arabic."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Image URL */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Cover Image URL</Label>
                        <Input
                          value={articleForm.image_url}
                          onChange={(e) => setArticleForm(f => ({ ...f, image_url: e.target.value }))}
                          placeholder="https://example.com/image.jpg"
                          type="url"
                        />
                        {articleForm.image_url && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                            <img src={articleForm.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                        )}
                      </div>
                      {/* Titles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title (English) *</Label>
                          <Input
                            value={articleForm.title_en}
                            onChange={(e) => setArticleForm(f => ({ ...f, title_en: e.target.value }))}
                            placeholder="Gold market analysis..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title (Arabic)</Label>
                          <Input
                            value={articleForm.title_ar}
                            onChange={(e) => setArticleForm(f => ({ ...f, title_ar: e.target.value }))}
                            placeholder="تحليل سوق الذهب..."
                            dir="rtl"
                          />
                        </div>
                      </div>
                      {/* Summaries */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Summary (English)</Label>
                          <Textarea
                            value={articleForm.summary_en}
                            onChange={(e) => setArticleForm(f => ({ ...f, summary_en: e.target.value }))}
                            placeholder="Brief summary shown on card..."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Summary (Arabic)</Label>
                          <Textarea
                            value={articleForm.summary_ar}
                            onChange={(e) => setArticleForm(f => ({ ...f, summary_ar: e.target.value }))}
                            placeholder="ملخص قصير يظهر على البطاقة..."
                            rows={2}
                            dir="rtl"
                          />
                        </div>
                      </div>
                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tags (comma separated)</Label>
                        <Input
                          value={articleForm.tags}
                          onChange={(e) => setArticleForm(f => ({ ...f, tags: e.target.value }))}
                          placeholder="Gold, Analysis, Market Update"
                        />
                        {articleForm.tags && (
                          <div className="flex flex-wrap gap-1">
                            {articleForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="space-y-2">
                        <Label>Content (English) *</Label>
                        <Textarea
                          value={articleForm.content_en}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_en: e.target.value }))}
                          placeholder="Write your analysis here..."
                          rows={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content (Arabic)</Label>
                        <Textarea
                          value={articleForm.content_ar}
                          onChange={(e) => setArticleForm(f => ({ ...f, content_ar: e.target.value }))}
                          placeholder="اكتب تحليلك هنا..."
                          rows={8}
                          dir="rtl"
                        />
                      </div>
                      {/* Published + Submit */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="article-published"
                          checked={articleForm.published}
                          onChange={(e) => setArticleForm(f => ({ ...f, published: e.target.checked }))}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="article-published">Published</Label>
                      </div>
                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                        disabled={!articleForm.title_en.trim() || !articleForm.content_en.trim()}
                        onClick={handleSaveArticle}
                      >
                        {editingArticle ? "Update Article" : "Publish Article"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {loadingArticles ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : articles.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No articles yet.</p>
                  <p className="text-sm text-muted-foreground">Create your first gold analysis article above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Card key={article.id} className="border-border bg-card overflow-hidden">
                    {article.image_url && (
                      <div className="relative w-full h-32 overflow-hidden">
                        <img src={article.image_url} alt={article.title_en} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{article.title_en}</CardTitle>
                          {article.title_ar && (
                            <p className="text-sm text-muted-foreground mt-1" dir="rtl">{article.title_ar}</p>
                          )}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Badge variant="outline" className={article.published
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }>
                            {article.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.summary_en || article.content_en}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(article.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:text-yellow-300"
                            onClick={() => handleTogglePublished(article)}
                          >
                            {article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={() => handleEditArticle(article)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          {/* Gold Articles Tab */}
        </Tabs>
      </div>
    </div>
  )
}
