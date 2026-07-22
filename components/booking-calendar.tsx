"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Video,
  CalendarCheck,
  ArrowRight,
} from "lucide-react"
import { format, isSameDay, parseISO } from "date-fns"
import { useTranslations } from "next-intl"
import type { AvailabilitySlot } from "@/lib/types/appointments"

type Step = "calendar" | "slots" | "form" | "success"

const STEPS: Step[] = ["calendar", "slots", "form", "success"]

// Convert a Cairo-local time string to the visitor's timezone.
// Slots are stored as Africa/Cairo local times (UTC+2, no DST).
function cairoToLocal(
  slotDate: string,
  timeStr: string,
  userTz: string
): { displayTime: string; tzAbbr: string; dayOffset: number } {
  // Compute Cairo's UTC offset in ms for this date
  const probe = new Date(`${slotDate}T12:00:00Z`)
  const utcMs = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  const cairoMs = new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime()
  const cairoOffsetMs = cairoMs - utcMs

  // Treat the Cairo time as UTC, then subtract Cairo's offset → true UTC
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr
  const cairoAsUtc = new Date(`${slotDate}T${normalizedTime}Z`)
  const trueUtc = new Date(cairoAsUtc.getTime() - cairoOffsetMs)

  const displayTime = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(trueUtc)

  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    timeZoneName: "short",
  }).format(trueUtc).split(", ").pop() ?? userTz

  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: userTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(trueUtc)

  const dayOffset = localDate < slotDate ? -1 : localDate > slotDate ? 1 : 0
  return { displayTime, tzAbbr, dayOffset }
}

export default function BookingCalendar(
  { defaultEmail = "", lockEmail = false }: { defaultEmail?: string; lockEmail?: boolean } = {}
) {
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
    client_email: defaultEmail,
    client_phone: "",
    client_message: "",
  })

  const [emailChecked, setEmailChecked] = useState(false)
  const [emailAllowed, setEmailAllowed] = useState(false)
  const [remainingHours, setRemainingHours] = useState(0)
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [userTimezone, setUserTimezone] = useState("Africa/Cairo")

  useEffect(() => {
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const currentStepIndex = STEPS.indexOf(step)

  const verifyEmail = async (email: string) => {
    if (!email || !email.includes("@")) { setEmailChecked(false); setEmailAllowed(false); setWeeklyLimitReached(false); return }
    setVerifyingEmail(true)
    try {
      const res = await fetch("/api/check-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), slot_date: selectedSlot?.date }),
      })
      const data = await res.json()
      setEmailChecked(true)
      setEmailAllowed(!!data.allowed)
      setRemainingHours(data.remaining_hours || 0)
      setWeeklyLimitReached(!!data.weekly_limit_reached)
    } catch {
      setEmailChecked(true)
      setEmailAllowed(false)
      setRemainingHours(0)
      setWeeklyLimitReached(false)
    }
    setVerifyingEmail(false)
  }

  // When the email is pre-filled from the logged-in account, auto-verify hours
  // as soon as a slot is chosen (the weekly-limit check depends on the slot date).
  useEffect(() => {
    if (defaultEmail && selectedSlot) verifyEmail(defaultEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.id, defaultEmail])

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
    if (!selectedSlot || !emailAllowed) return

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
          client_timezone: userTimezone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const mappedError =
          data.error === "noHoursRemaining"
            ? t("noHoursError")
            : data.error === "weeklyLimitReached"
              ? t("weeklyLimitError")
              : data.error || t("errorBooking")

        setError(mappedError)
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
    setFormData({ client_name: "", client_email: defaultEmail, client_phone: "", client_message: "" })
    setError(null)
    setConfirmationData(null)
    setEmailChecked(false)
    setEmailAllowed(false)
    setRemainingHours(0)
    setWeeklyLimitReached(false)
    const now = new Date()
    fetchMonthSlots(format(now, "yyyy-MM"))
  }

  return (
    <section className="relative min-h-screen py-20 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Step indicator */}
        {step !== "success" && (
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEPS.slice(0, 3).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    i < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === currentStepIndex
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < currentStepIndex ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`h-0.5 w-8 sm:w-12 rounded-full transition-all duration-300 ${
                      i < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step: Calendar */}
        {step === "calendar" && (
          <div className="mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-xl shadow-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{t("selectDate")}</h2>
                  <p className="text-xs text-muted-foreground">{t("description")}</p>
                </div>
              </div>
              <div className="flex justify-center">
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
                    available:
                      "bg-primary/10 font-semibold text-primary hover:bg-primary/20",
                  }}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Slots */}
        {step === "slots" && selectedDate && (
          <div className="mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-xl shadow-black/5">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setStep("calendar")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{t("availableSlots")}</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(selectedDate, "EEEE, MMM d, yyyy")}
                    {" · "}
                    {cairoToLocal(format(selectedDate, "yyyy-MM-dd"), "12:00", userTimezone).tzAbbr}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading slots...</p>
                  </div>
                ) : error ? (
                  <p className="text-center text-sm text-destructive py-8">{error}</p>
                ) : slots.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {slots.map((slot) => {
                      const localStart = cairoToLocal(slot.date, slot.start_time, userTimezone)
                      const localEnd = cairoToLocal(slot.date, slot.end_time, userTimezone)
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className="group flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3.5 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                        >
                          <span className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                              <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <span className="flex flex-col">
                              <span className="font-medium">
                                {localStart.displayTime} {"\u2013"} {localEnd.displayTime}
                              </span>
                              {localStart.dayOffset !== 0 && (
                                <span className="text-xs text-amber-500">
                                  {localStart.dayOffset < 0 ? t("prevDay") : t("nextDay")}
                                </span>
                              )}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {slot.duration} {t("minutes")}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Form */}
        {step === "form" && selectedSlot && selectedDate && (
          <div className="mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">
              {/* Session summary bar */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setStep("slots")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <p className="text-sm font-semibold">{t("yourDetails")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(selectedDate, "EEE, MMM d")} {"\u00b7"}{" "}
                        {cairoToLocal(selectedSlot.date, selectedSlot.start_time, userTimezone).displayTime}
                        {" \u2013 "}
                        {cairoToLocal(selectedSlot.date, selectedSlot.end_time, userTimezone).displayTime}
                        {" \u00b7 "}
                        {cairoToLocal(selectedSlot.date, selectedSlot.start_time, userTimezone).tzAbbr}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    <Video className="mr-1 h-3 w-3" />
                    Zoom {"\u00b7"} {selectedSlot.duration} {t("minutes")}
                  </Badge>
                </div>
              </div>

              {/* Form body */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("name")} *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="name"
                          required
                          value={formData.client_name}
                          onChange={(e) => setFormData((p) => ({ ...p, client_name: e.target.value }))}
                          placeholder={t("namePlaceholder")}
                          className="pl-10 h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("email")} *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="email"
                          type="email"
                          required
                          readOnly={lockEmail}
                          value={formData.client_email}
                          onChange={(e) => { if (lockEmail) return; setFormData((p) => ({ ...p, client_email: e.target.value })); setEmailChecked(false); setEmailAllowed(false); setWeeklyLimitReached(false) }}
                          onBlur={(e) => verifyEmail(e.target.value)}
                          placeholder={t("emailPlaceholder")}
                          className={`pl-10 h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors ${lockEmail ? "cursor-not-allowed opacity-80" : ""}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hours verification */}
                  {verifyingEmail && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("verifyingEmail")}</div>}
                  {emailChecked && !verifyingEmail && emailAllowed && <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3"><CheckCircle2 className="h-4 w-4 text-green-500" /><p className="text-sm text-green-600 dark:text-green-400">{t("hoursAvailable", { hours: remainingHours })}</p></div>}
                  {emailChecked && !verifyingEmail && !emailAllowed && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3"><p className="text-sm text-destructive">{weeklyLimitReached ? t("weeklyLimitError") : t("noHoursError")}</p></div>}

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("phone")}
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.client_phone}
                        onChange={(e) => setFormData((p) => ({ ...p, client_phone: e.target.value }))}
                        placeholder={t("phonePlaceholder")}
                        className="pl-10 h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("message")}
                    </Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <Textarea
                        id="message"
                        value={formData.client_message}
                        onChange={(e) => setFormData((p) => ({ ...p, client_message: e.target.value }))}
                        placeholder={t("messagePlaceholder")}
                        rows={3}
                        className="pl-10 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                    disabled={submitting || !emailAllowed || verifyingEmail}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("submitting")}
                      </>
                    ) : (
                      <>
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        {t("confirmBooking")}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && confirmationData && (
          <div className="mx-auto max-w-md animate-in fade-in zoom-in-95 duration-500">
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 shadow-xl shadow-black/5 text-center">
              {/* Animated check */}
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2">{t("successTitle")}</h2>
              <p className="text-muted-foreground mb-6">{t("successMessage")}</p>

              {/* Session details card */}
              <div className="rounded-xl bg-muted/50 border border-border/50 p-4 mb-6 text-sm text-left space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("date")}</p>
                    <p className="font-medium">{confirmationData.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("time")}</p>
                    <p className="font-medium">
                      {cairoToLocal(confirmationData.date, confirmationData.time, userTimezone).displayTime}
                      {" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        {cairoToLocal(confirmationData.date, confirmationData.time, userTimezone).tzAbbr}
                      </span>
                    </p>
                  </div>
                </div>
                {confirmationData.zoomUrl && (
                  <a
                    href={confirmationData.zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 transition-colors hover:bg-blue-500/20"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                      <Video className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-400">{t("joinMeeting")}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {confirmationData.zoomUrl}
                      </p>
                    </div>
                  </a>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                {t("confirmationEmail")}
              </p>

              <Button
                className="w-full h-11 rounded-xl"
                variant="outline"
                onClick={resetBooking}
              >
                {t("bookAnother")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}