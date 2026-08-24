"use client"

import { useEffect, useState, useCallback } from "react"
import { useLocale } from "next-intl"
import { Loader2, X, CheckCircle2, Calendar as CalendarIcon, Clock } from "lucide-react"
import { format, isSameDay, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const dict = {
  en: {
    title: "Reschedule Session",
    currentlyScheduled: "Currently scheduled",
    pickDate: "Pick a new date",
    pickDateHint: "Highlighted days have open times.",
    availableTimes: "Available times",
    noSlots: "No open times on this date. Try another highlighted day.",
    loadingSlots: "Loading times…",
    loadingCalendar: "Loading calendar…",
    confirm: "Confirm New Time",
    confirming: "Rescheduling…",
    cancel: "Cancel",
    close: "Close",
    success: "Session Rescheduled!",
    successMessage: "Your session has been moved. A confirmation email is on its way.",
    error: "Something went wrong. Please try again.",
    weeklyLimit: "You've reached your weekly session limit for that week.",
    min: "min",
    prevDay: "prev. day",
    nextDay: "next day",
  },
  ar: {
    title: "إعادة جدولة الجلسة",
    currentlyScheduled: "الموعد الحالي",
    pickDate: "اختر تاريخًا جديدًا",
    pickDateHint: "الأيام المميزة بها أوقات متاحة.",
    availableTimes: "الأوقات المتاحة",
    noSlots: "لا توجد أوقات متاحة في هذا اليوم. جرّب يومًا آخر مميزًا.",
    loadingSlots: "جاري تحميل الأوقات…",
    loadingCalendar: "جاري تحميل التقويم…",
    confirm: "تأكيد الموعد الجديد",
    confirming: "جاري إعادة الجدولة…",
    cancel: "إلغاء",
    close: "إغلاق",
    success: "تمت إعادة جدولة الجلسة!",
    successMessage: "تم نقل جلستك. سيصلك بريد تأكيد قريبًا.",
    error: "حدث خطأ ما. حاول مرة أخرى.",
    weeklyLimit: "لقد وصلت إلى الحد الأسبوعي للجلسات في ذلك الأسبوع.",
    min: "دقيقة",
    prevDay: "اليوم السابق",
    nextDay: "اليوم التالي",
  },
}

type SlotOption = { id: string; date: string; start_time: string; end_time: string; duration: number }

// Slots are stored as Africa/Cairo local wall-clock time — convert to the
// viewer's own timezone so what they see always matches their own clock.
function cairoToLocal(slotDate: string, timeStr: string, userTz: string): { displayTime: string; tzAbbr: string; dayOffset: number } {
  const probe = new Date(`${slotDate}T12:00:00Z`)
  const utcMs = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  const cairoMs = new Date(probe.toLocaleString("en-US", { timeZone: "Africa/Cairo" })).getTime()
  const cairoOffsetMs = cairoMs - utcMs

  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr
  const cairoAsUtc = new Date(`${slotDate}T${normalizedTime}Z`)
  const trueUtc = new Date(cairoAsUtc.getTime() - cairoOffsetMs)

  const displayTime = new Intl.DateTimeFormat("en-US", { timeZone: userTz, hour: "2-digit", minute: "2-digit", hour12: false }).format(trueUtc)
  const tzAbbr = new Intl.DateTimeFormat("en-US", { timeZone: userTz, timeZoneName: "short" }).format(trueUtc).split(", ").pop() ?? userTz
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: userTz, year: "numeric", month: "2-digit", day: "2-digit" }).format(trueUtc)
  const dayOffset = localDate < slotDate ? -1 : localDate > slotDate ? 1 : 0

  return { displayTime, tzAbbr, dayOffset }
}

export function RescheduleSessionModal({
  bookingId,
  duration,
  currentDate,
  currentStartTime,
  onClose,
  onRescheduled,
}: {
  bookingId: string
  duration: number
  currentDate: string | null
  currentStartTime: string | null
  onClose: () => void
  onRescheduled: () => void
}) {
  const locale = useLocale()
  const l = dict[locale as keyof typeof dict] || dict.en

  const [userTimezone, setUserTimezone] = useState("Africa/Cairo")
  useEffect(() => {
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const [monthSlots, setMonthSlots] = useState<SlotOption[]>([])
  const [monthLoading, setMonthLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [slots, setSlots] = useState<SlotOption[] | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const fetchMonth = useCallback(
    async (month: string) => {
      setMonthLoading(true)
      try {
        const res = await fetch(`/api/slots?month=${month}`)
        const data = await res.json()
        setMonthSlots((data.slots ?? []).filter((s: SlotOption) => s.duration === duration))
      } catch {
        setMonthSlots([])
      } finally {
        setMonthLoading(false)
      }
    },
    [duration]
  )

  useEffect(() => {
    fetchMonth(format(new Date(), "yyyy-MM"))
  }, [fetchMonth])

  const availableDates = monthSlots.map((s) => parseISO(s.date))
  // Only future days get the "available" highlight — a past day that
  // happens to have a stale slot row is still disabled, so it shouldn't
  // look pickable.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const highlightDates = availableDates.filter((d) => d >= todayStart)

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    setSelectedDate(date)
    setSelectedSlotId(null)
    setSlots(null)
    const dateStr = format(date, "yyyy-MM-dd")
    fetch(`/api/slots?date=${dateStr}`)
      .then((r) => r.json())
      .then((d: { slots?: SlotOption[] }) => setSlots((d.slots ?? []).filter((s) => s.duration === duration)))
      .catch(() => setSlots([]))
  }

  const confirm = async () => {
    if (!selectedSlotId) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_slot_id: selectedSlotId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === "weeklyLimitReached" ? l.weeklyLimit : data.error || l.error)
        return
      }
      setDone(true)
      onRescheduled()
    } catch {
      setError(l.error)
    } finally {
      setSubmitting(false)
    }
  }

  const currentLocal = currentDate && currentStartTime ? cairoToLocal(currentDate, currentStartTime, userTimezone) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{l.title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <p className="text-lg font-bold text-emerald-500">{l.success}</p>
            <p className="mt-2 text-sm text-muted-foreground">{l.successMessage}</p>
            <Button type="button" className="mt-4 w-full" onClick={onClose}>{l.close}</Button>
          </div>
        ) : (
          <>
            {currentDate && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                {l.currentlyScheduled}: {new Date(currentDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {currentLocal ? ` · ${currentLocal.displayTime} (${currentLocal.tzAbbr})` : ""}
              </p>
            )}

            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{l.pickDate}</p>
            <p className="mb-2 text-[11px] text-muted-foreground/70">{l.pickDateHint}</p>

            {monthLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {l.loadingCalendar}
              </div>
            ) : (
              <div className="mb-3 flex justify-center rounded-lg border border-border/60 bg-background/50">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  onMonthChange={(m) => fetchMonth(format(m, "yyyy-MM"))}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (date < today) return true
                    return !availableDates.some((d) => isSameDay(d, date))
                  }}
                  modifiers={{ available: highlightDates }}
                  modifiersClassNames={{ available: "m-0.5 rounded-lg bg-primary/10 font-semibold text-primary hover:bg-primary/20" }}
                />
              </div>
            )}

            {selectedDate && (
              <>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{l.availableTimes}</p>
                {slots === null ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {l.loadingSlots}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="rounded-lg border border-border/60 py-4 text-center text-sm text-muted-foreground">{l.noSlots}</p>
                ) : (
                  <div className="mb-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                    {slots.map((s) => {
                      const local = cairoToLocal(s.date, s.start_time, userTimezone)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSlotId(s.id)}
                          className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                            selectedSlotId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/50"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> {local.displayTime} <span className="text-[10px] font-normal text-muted-foreground">{local.tzAbbr}</span>
                          </span>
                          {local.dayOffset !== 0 && (
                            <Badge variant="outline" className="h-4 px-1 text-[9px] font-normal text-amber-500">
                              {local.dayOffset < 0 ? l.prevDay : l.nextDay}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {error && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-center text-xs text-red-400">{error}</p>}

            <Button type="button" className="mb-2 w-full" onClick={confirm} disabled={!selectedSlotId || submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {l.confirming}</> : l.confirm}
            </Button>
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted">{l.cancel}</button>
          </>
        )}
      </div>
    </div>
  )
}
