"use client"

import { useState, useEffect, useCallback } from "react"
import { format, isSameDay, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon, Clock, Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import type { AvailabilitySlot } from "@/lib/types/appointments"
import { OKXPayButton, WhopPayButton } from "@/components/payment-buttons"
import { alexandria } from "@/lib/fonts"

const GRID_BG = [
  "radial-gradient(ellipse 800px 400px at 50% -10%, hsl(var(--primary) / 0.14), transparent 60%)",
  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
].join(", ")

const DURATIONS = [
  { hours: 1, price: 100, plan: "consultation-1h" },
  { hours: 2, price: 180, plan: "consultation-2h" },
  { hours: 3, price: 260, plan: "consultation-3h" },
  { hours: 4, price: 340, plan: "consultation-4h" },
  { hours: 5, price: 420, plan: "consultation-5h" },
]

/** Above this many hours the client picks any date they like (no block that
 *  long exists on the public calendar) — at or below it they must pick one of
 *  the admin's open slots. */
const FREE_DATE_THRESHOLD = 3

type Step = "duration" | "date" | "payment"

export function ConsultationBooking() {
  const [step, setStep] = useState<Step>("duration")
  const [selected, setSelected] = useState(DURATIONS[0])

  const [monthSlots, setMonthSlots] = useState<AvailabilitySlot[]>([])
  const [daySlots, setDaySlots] = useState<AvailabilitySlot[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [pickedDate, setPickedDate] = useState<Date | undefined>()
  const [pickedSlot, setPickedSlot] = useState<AvailabilitySlot | null>(null)
  const [customTime, setCustomTime] = useState("")
  const [dateError, setDateError] = useState("")

  const isFreeDate = selected.hours > FREE_DATE_THRESHOLD

  const fetchMonthSlots = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/slots?month=${month}`)
      const data = await res.json()
      setMonthSlots(data.slots || [])
    } catch {
      setMonthSlots([])
    }
  }, [])

  useEffect(() => {
    fetchMonthSlots(format(new Date(), "yyyy-MM"))
  }, [fetchMonthSlots])

  const availableDates = monthSlots.map((s) => parseISO(s.date))
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const resetDate = () => {
    setPickedDate(undefined)
    setPickedSlot(null)
    setCustomTime("")
    setDateError("")
    setDaySlots([])
  }

  const handleDaySelect = async (date: Date | undefined) => {
    if (!date) return
    setPickedDate(date)
    setPickedSlot(null)
    setDateError("")
    if (isFreeDate) return
    setLoadingDay(true)
    try {
      const res = await fetch(`/api/slots?date=${format(date, "yyyy-MM-dd")}`)
      const data = await res.json()
      setDaySlots(data.slots || [])
    } catch {
      setDaySlots([])
    } finally {
      setLoadingDay(false)
    }
  }

  /** Machine-readable start time carried on the order: an absolute UTC
   *  instant for free-date picks (built from the visitor's own clock), or a
   *  bare Cairo wall-clock stamp for slots, which are stored in Cairo time. */
  const preferredStart = (() => {
    if (isFreeDate) {
      if (!pickedDate || !customTime) return ""
      const [hh, mm] = customTime.split(":").map(Number)
      const local = new Date(pickedDate)
      local.setHours(hh, mm, 0, 0)
      return local.toISOString()
    }
    return pickedSlot ? `${pickedSlot.date}T${pickedSlot.start_time.slice(0, 5)}` : ""
  })()

  /** Same moment, formatted for the on-screen summary. */
  const preferredDateLabel = isFreeDate
    ? pickedDate && customTime
      ? `${format(pickedDate, "yyyy-MM-dd")} ${customTime}`
      : ""
    : pickedSlot
      ? `${pickedSlot.date} ${pickedSlot.start_time.slice(0, 5)} (بتوقيت القاهرة)`
      : ""

  const goToPayment = () => {
    if (!preferredStart) {
      setDateError(isFreeDate ? "اختر التاريخ والوقت المناسب لك." : "اختر أحد المواعيد المتاحة.")
      return
    }
    setStep("payment")
  }

  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${alexandria.className} min-h-screen bg-background text-foreground`}
      style={{ backgroundImage: GRID_BG, backgroundSize: "100% 100%, 32px 32px, 32px 32px" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <CalendarIcon className="h-4 w-4" /> استشارة فردية مدفوعة
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-balance md:text-5xl">
            احجز <span className="text-primary">استشارتك</span> مع Mentix
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            جلسة فردية مباشرة لمناقشة حسابك، خطتك، أو أي استفسار يخص التداول — اختر المدة والموعد، ثم أكمل الدفع.
          </p>
        </section>

        <section className="mx-auto mt-12 rounded-3xl border border-border bg-card p-6 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.2)] md:p-10">
          {/* Progress */}
          <div className="mb-8 flex gap-1.5">
            {(["duration", "date", "payment"] as Step[]).map((s, i) => {
              const currentIndex = ["duration", "date", "payment"].indexOf(step)
              return <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIndex ? "bg-primary" : "bg-muted"}`} />
            })}
          </div>

          {/* Step 1: duration */}
          {step === "duration" && (
            <>
              <h2 className="text-center text-lg font-bold text-foreground">اختر مدة الاستشارة</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.hours}
                    type="button"
                    onClick={() => { setSelected(d); resetDate() }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 transition-colors ${
                      selected.hours === d.hours
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Clock className="h-3.5 w-3.5" /> {d.hours === 1 ? "ساعة" : `${d.hours} ساعات`}
                    </span>
                    <span className="text-lg font-extrabold">{d.price}$</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">100$ للساعة الأولى، و80$ لكل ساعة إضافية.</p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground">المجموع:</span>
                <span className="text-3xl font-extrabold text-primary">{selected.price}$</span>
              </div>

              <Button onClick={() => setStep("date")} className="mt-8 h-12 w-full gap-2 rounded-xl text-base font-bold">
                اختر الموعد <ArrowLeft className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Step 2: date */}
          {step === "date" && (
            <>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setStep("duration")}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-bold text-foreground">اختر موعد الاستشارة</h2>
                  <p className="text-xs text-muted-foreground">
                    {isFreeDate
                      ? "استشارتك أطول من 3 ساعات — اختر أي تاريخ ووقت يناسبك وسنرتبه لك."
                      : "اختر أحد المواعيد المتاحة في التقويم."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Calendar
                  mode="single"
                  selected={pickedDate}
                  onSelect={handleDaySelect}
                  onMonthChange={(m) => fetchMonthSlots(format(m, "yyyy-MM"))}
                  disabled={(date) => {
                    if (date < todayStart) return true
                    if (isFreeDate) return false
                    return !availableDates.some((d) => isSameDay(d, date))
                  }}
                  modifiers={isFreeDate ? undefined : { available: availableDates.filter((d) => d >= todayStart) }}
                  modifiersClassNames={{ available: "m-0.5 rounded-lg bg-primary/10 font-semibold text-primary hover:bg-primary/20" }}
                  className="rounded-xl"
                />
              </div>

              {/* Free-date: time input */}
              {isFreeDate && pickedDate && (
                <div className="mx-auto mt-5 max-w-xs">
                  <label className="mb-2 block text-sm font-medium text-foreground">الوقت المناسب لك</label>
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => { setCustomTime(e.target.value); setDateError("") }}
                    className="h-12 rounded-xl border-border bg-background text-foreground"
                  />
                </div>
              )}

              {/* Slot-based: available times for the picked day */}
              {!isFreeDate && pickedDate && (
                <div className="mt-6">
                  {loadingDay ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : daySlots.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مواعيد متاحة في هذا اليوم.</p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {daySlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => { setPickedSlot(slot); setDateError("") }}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                            pickedSlot?.id === slot.id
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </span>
                          {pickedSlot?.id === slot.id && <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-center text-xs text-muted-foreground">المواعيد معروضة بتوقيت القاهرة.</p>
                </div>
              )}

              {dateError && (
                <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">{dateError}</p>
              )}

              <Button onClick={goToPayment} className="mt-8 h-12 w-full gap-2 rounded-xl text-base font-bold">
                متابعة الدفع <ArrowLeft className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Step 3: payment */}
          {step === "payment" && (
            <>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setStep("date")}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="font-bold text-foreground">إتمام الدفع</h2>
                  <p className="text-xs text-muted-foreground">راجع تفاصيل استشارتك ثم اختر طريقة الدفع.</p>
                </div>
              </div>

              <div className="mt-6 space-y-2 rounded-2xl border border-border bg-background p-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المدة</span>
                  <span className="font-medium text-foreground">{selected.hours === 1 ? "ساعة واحدة" : `${selected.hours} ساعات`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الموعد</span>
                  <span className="font-medium text-foreground">{preferredDateLabel}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">المجموع</span>
                  <span className="text-2xl font-extrabold text-primary">{selected.price}$</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <WhopPayButton plan={selected.plan} preferredDate={preferredStart} preferredSlotId={pickedSlot?.id} className="w-full justify-center" />
                <OKXPayButton plan={selected.plan} preferredDate={preferredStart} preferredSlotId={pickedSlot?.id} className="w-full justify-center" />
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                بعد إتمام الدفع سنرسل لك رابط جلسة Zoom على بريدك الإلكتروني مباشرة.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
