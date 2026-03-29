"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CalendarDays, Clock, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { format, isSameDay, parseISO } from "date-fns"
import { useTranslations } from "next-intl"
import type { AvailabilitySlot } from "@/lib/types/appointments"

type Step = "calendar" | "slots" | "form" | "success"

export default function BookingCalendar() {
  const t = useTranslations("booking")

  const [step, setStep] = useState<Step>("calendar")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationData, setConfirmationData] = useState<{
    date: string
    time: string
    zoomUrl?: string
  } | null>(null)

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    client_message: "",
  })

  const fetchMonthSlots = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/slots?month=${month}`)
      const data = await res.json()
      if (data.slots) {
        setAllSlots(data.slots)
      }
    } catch {
      // Silently fail for month overview
    }
  }, [])

  const fetchDateSlots = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/slots?date=${date}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSlots(data.slots || [])
      }
    } catch {
      setError(t("errorLoading"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const now = new Date()
    const month = format(now, "yyyy-MM")
    fetchMonthSlots(month)
  }, [fetchMonthSlots])

  const availableDates = allSlots.map((s) => parseISO(s.date))

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    setSelectedDate(date)
    setSelectedSlot(null)
    const dateStr = format(date, "yyyy-MM-dd")
    fetchDateSlots(dateStr)
    setStep("slots")
  }

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot)
    setStep("form")
  }

  const handleMonthChange = (month: Date) => {
    const monthStr = format(month, "yyyy-MM")
    fetchMonthSlots(monthStr)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          client_name: formData.client_name.trim(),
          client_email: formData.client_email.trim(),
          client_phone: formData.client_phone.trim() || undefined,
          client_message: formData.client_message.trim() || undefined,
          duration: selectedSlot.duration,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t("errorBooking"))
        return
      }

      setConfirmationData({
        date: selectedSlot.date,
        time: selectedSlot.start_time,
        zoomUrl: data.zoom_join_url,
      })
      setStep("success")
    } catch {
      setError(t("errorBooking"))
    } finally {
      setSubmitting(false)
    }
  }

  const resetBooking = () => {
    setStep("calendar")
    setSelectedDate(undefined)
    setSelectedSlot(null)
    setSlots([])
    setFormData({ client_name: "", client_email: "", client_phone: "", client_message: "" })
    setError(null)
    setConfirmationData(null)
    const now = new Date()
    fetchMonthSlots(format(now, "yyyy-MM"))
  }

  return (
    <section className="py-16 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            {t("badge")}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")} <span className="text-primary">{t("titleHighlight")}</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {t("description")}
          </p>
        </div>

        {step === "calendar" && (
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-lg">{t("selectDate")}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  if (date < today) return true
                  return !availableDates.some((d) => isSameDay(d, date))
                }}
                modifiers={{
                  available: availableDates,
                }}
                modifiersClassNames={{
                  available: "bg-primary/10 font-semibold text-primary",
                }}
              />
            </CardContent>
          </Card>
        )}

        {step === "slots" && selectedDate && (
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("calendar")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {t("availableSlots")} — {format(selectedDate, "MMM d, yyyy")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <p className="text-center text-sm text-destructive py-4">{error}</p>
              ) : slots.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  {t("noSlots")}
                </p>
              ) : (
                <div className="grid gap-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant="outline"
                      className="justify-between h-auto py-3"
                      onClick={() => handleSlotSelect(slot)}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                      </span>
                      <Badge variant="secondary">{slot.duration} {t("minutes")}</Badge>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "form" && selectedSlot && selectedDate && (
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("slots")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">{t("yourDetails")}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {format(selectedDate, "MMM d, yyyy")} · {selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)} ({selectedSlot.duration} {t("minutes")})
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("name")} *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData((p) => ({ ...p, client_name: e.target.value }))}
                    placeholder={t("namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")} *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.client_email}
                    onChange={(e) => setFormData((p) => ({ ...p, client_email: e.target.value }))}
                    placeholder={t("emailPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => setFormData((p) => ({ ...p, client_phone: e.target.value }))}
                    placeholder={t("phonePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">{t("message")}</Label>
                  <Textarea
                    id="message"
                    value={formData.client_message}
                    onChange={(e) => setFormData((p) => ({ ...p, client_message: e.target.value }))}
                    placeholder={t("messagePlaceholder")}
                    rows={3}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("confirmBooking")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "success" && confirmationData && (
          <Dialog open onOpenChange={() => resetBooking()}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  {t("successTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("successMessage")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <p><strong>{t("date")}:</strong> {confirmationData.date}</p>
                  <p><strong>{t("time")}:</strong> {confirmationData.time}</p>
                  {confirmationData.zoomUrl && (
                    <p>
                      <strong>Zoom:</strong>{" "}
                      <a
                        href={confirmationData.zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {t("joinMeeting")}
                      </a>
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("confirmationEmail")}
                </p>
                <Button className="w-full" onClick={resetBooking}>
                  {t("bookAnother")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  )
}
