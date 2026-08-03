"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, Users, Video } from "lucide-react"

type Slot = { id: string; date: string; start_time: string; end_time: string; duration: number; is_booked: boolean }
type Booking = {
  id: string
  client_name: string
  client_email: string
  duration: number
  status: string
  zoom_start_url: string | null
  availability_slots: Slot | null
}
type Order = { orderId: string; amount: string; status: "pending" | "paid" | "expired"; paidAt?: string }
type Sub = { client_email: string; client_name: string; plan: string; status: string; remaining_hours: number }
type Invoice = {
  id: string; client_email: string; client_name: string; title: string
  total_amount: number; currency: string; status: string
  invoice_installments: { amount: number; due_date: string; status: string }[]
}

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export function AdminOverview({ bookings, slots, orders }: { bookings: Booking[]; slots: Slot[]; orders: Order[] }) {
  const [subs, setSubs] = useState<Sub[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/admin/subscriptions").then((r) => r.json()).then((d) => setSubs(d.subscriptions || [])).catch(() => {})
    fetch("/api/admin/invoices").then((r) => r.json()).then((d) => setInvoices(d.invoices || [])).catch(() => {})
  }, [])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const activeMentees = useMemo(
    () => new Set(subs.filter((s) => s.status === "active").map((s) => s.client_email.toLowerCase())).size,
    [subs]
  )

  const weekBounds = useMemo(() => {
    const now = new Date()
    const dow = (now.getDay() + 6) % 7 // Monday = 0
    const start = new Date(now)
    start.setDate(now.getDate() - dow)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }, [])

  const sessionsThisWeek = useMemo(
    () =>
      bookings.filter((b) => {
        const d = b.availability_slots?.date
        return d && d >= weekBounds.start && d <= weekBounds.end && (b.status === "confirmed" || b.status === "completed")
      }).length,
    [bookings, weekBounds]
  )
  const openSlotsThisWeek = useMemo(
    () => slots.filter((s) => !s.is_booked && s.date >= weekBounds.start && s.date <= weekBounds.end).length,
    [slots, weekBounds]
  )

  const revenueThisMonth = useMemo(() => {
    const ym = today.slice(0, 7)
    return orders
      .filter((o) => o.status === "paid" && o.paidAt?.slice(0, 7) === ym)
      .reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0)
  }, [orders, today])

  const invoicesPending = useMemo(() => {
    const pending = invoices.filter((i) => ["pending", "partially_paid", "overdue"].includes(i.status))
    const remaining = pending.reduce((sum, inv) => {
      const paid = inv.invoice_installments.filter((x) => x.status === "paid").reduce((s, x) => s + x.amount, 0)
      return sum + Math.max(0, inv.total_amount - paid)
    }, 0)
    return { count: pending.length, amount: remaining, overdue: invoices.filter((i) => i.status === "overdue").length }
  }, [invoices])

  const lowHourClients = useMemo(
    () => subs.filter((s) => s.status === "active" && s.remaining_hours <= 1).slice(0, 4),
    [subs]
  )

  const overdueInvoices = useMemo(() => invoices.filter((i) => i.status === "overdue").slice(0, 4), [invoices])

  const todaysSessions = useMemo(
    () =>
      bookings
        .filter((b) => b.availability_slots?.date === today && (b.status === "confirmed" || b.status === "completed"))
        .sort((a, b) => (a.availability_slots!.start_time > b.availability_slots!.start_time ? 1 : -1)),
    [bookings, today]
  )

  const last14Days = useMemo(() => {
    const days: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const count = bookings.filter((b) => b.availability_slots?.date === iso && b.status !== "cancelled").length
      days.push({ date: iso, count })
    }
    return days
  }, [bookings])
  const maxDay = Math.max(1, ...last14Days.map((d) => d.count))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Mentees</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{activeMentees}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sessions This Week</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
              {sessionsThisWeek}
              <span className="ml-1 text-sm font-medium text-muted-foreground">booked</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{openSlotsThisWeek} slots still open</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue This Month</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">${revenueThisMonth.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoices Pending</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-amber-400">${invoicesPending.amount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {invoicesPending.count} invoice{invoicesPending.count !== 1 ? "s" : ""}
              {invoicesPending.overdue > 0 && <span className="text-red-400"> · {invoicesPending.overdue} overdue</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">Needs attention</h3>
            </div>
            {overdueInvoices.length === 0 && lowHourClients.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              <div>
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{inv.client_name} — invoice overdue</p>
                      <p className="truncate text-xs text-muted-foreground">{inv.title}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold text-foreground">${inv.total_amount}</span>
                  </div>
                ))}
                {lowHourClients.map((s) => (
                  <div key={s.client_email} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.client_name} — {s.remaining_hours}h remaining</p>
                      <p className="truncate text-xs text-muted-foreground capitalize">{s.plan.replace(/-/g, " ")} plan</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Today&apos;s sessions</h3>
              <Badge variant="outline" className="ml-auto text-xs">{todaysSessions.length}</Badge>
            </div>
            {todaysSessions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No sessions booked for today.</p>
            ) : (
              <div>
                {todaysSessions.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
                    <span className="w-16 shrink-0 font-mono text-xs text-primary">
                      {b.availability_slots ? formatTime(b.availability_slots.start_time) : "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{b.client_name}</p>
                      <p className="text-xs text-muted-foreground">{b.duration} min</p>
                    </div>
                    {b.zoom_start_url && (
                      <a href={b.zoom_start_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary">
                        <Video className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Sessions — last 14 days</h3>
          </div>
          <div className="relative flex h-28 items-end gap-1.5">
            {last14Days.map((d, i) => (
              <div
                key={d.date}
                className="group relative flex-1"
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div
                  className="mx-auto w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                />
                {hoveredDay === i && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-popover px-2 py-1 font-mono text-[11px] text-foreground shadow-lg">
                    {d.count} on {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>14 days ago</span>
            <span>today</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
