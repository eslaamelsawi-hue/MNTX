"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { Loader2, X, CheckCircle2, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const dict = {
  en: {
    title: "Reschedule Session",
    currentlyScheduled: "Currently scheduled",
    pickDate: "Pick a new date",
    availableTimes: "Available times",
    noSlots: "No open times on this date. Try another day.",
    loadingSlots: "Loading times…",
    confirm: "Confirm New Time",
    confirming: "Rescheduling…",
    cancel: "Cancel",
    close: "Close",
    success: "Session Rescheduled!",
    successMessage: "Your session has been moved. A confirmation email is on its way.",
    error: "Something went wrong. Please try again.",
    weeklyLimit: "You've reached your weekly session limit for that week.",
    min: "min",
  },
  ar: {
    title: "إعادة جدولة الجلسة",
    currentlyScheduled: "الموعد الحالي",
    pickDate: "اختر تاريخًا جديدًا",
    availableTimes: "الأوقات المتاحة",
    noSlots: "لا توجد أوقات متاحة في هذا اليوم. جرّب يومًا آخر.",
    loadingSlots: "جاري تحميل الأوقات…",
    confirm: "تأكيد الموعد الجديد",
    confirming: "جاري إعادة الجدولة…",
    cancel: "إلغاء",
    close: "إغلاق",
    success: "تمت إعادة جدولة الجلسة!",
    successMessage: "تم نقل جلستك. سيصلك بريد تأكيد قريبًا.",
    error: "حدث خطأ ما. حاول مرة أخرى.",
    weeklyLimit: "لقد وصلت إلى الحد الأسبوعي للجلسات في ذلك الأسبوع.",
    min: "دقيقة",
  },
}

type SlotOption = { id: string; date: string; start_time: string; end_time: string; duration: number }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
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

  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<SlotOption[] | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    setSlots(null)
    setSelectedSlotId(null)
    fetch(`/api/slots?date=${date}`)
      .then((r) => r.json())
      .then((d: { slots?: SlotOption[] }) => setSlots((d.slots ?? []).filter((s) => s.duration === duration)))
      .catch(() => setSlots([]))
  }, [date, duration])

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
                <Calendar className="h-3.5 w-3.5" />
                {l.currentlyScheduled}: {new Date(currentDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {currentStartTime ? ` · ${currentStartTime.slice(0, 5)}` : ""}
              </p>
            )}

            <label className="mb-1 block text-xs font-medium text-muted-foreground">{l.pickDate}</label>
            <input
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />

            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{l.availableTimes}</p>
            {slots === null ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {l.loadingSlots}
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-lg border border-border/60 py-4 text-center text-sm text-muted-foreground">{l.noSlots}</p>
            ) : (
              <div className="mb-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                {slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      selectedSlotId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    <Clock className="h-3 w-3" /> {s.start_time.slice(0, 5)}
                  </button>
                ))}
              </div>
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
