"use client"

import { Fragment, useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"
import {
  Crown,
  RefreshCw,
  Users,
  XCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Mail,
  Save,
  CalendarPlus,
  CalendarX,
  RotateCcw,
} from "lucide-react"

type Sub = {
  id: string; client_email: string; client_name: string; plan: string
  total_hours: number; used_hours: number; remaining_hours: number
  status: string; starts_at: string; expires_at: string | null; notes: string | null; created_at: string
}

type BookingSlot = { date: string; start_time: string; end_time: string; duration: number }

type AvailSlot = { id: string; date: string; start_time: string; end_time: string; duration: number; is_booked: boolean }

type Booking = {
  id: string
  client_email: string
  duration: number
  status: string
  created_at: string
  availability_slots: BookingSlot | null
}

type MentorshipClient = {
  email: string
  name: string
  plans: string[]
  totalHours: number
  usedHours: number
  remainingHours: number
  isActive: boolean
  hasExpired: boolean
  subIds: string[]
  primarySubId: string
  notes: string
  bookings: Booking[]
  bookingCount: number
  daysSinceSecondSession: number | null
  latestExpiry: string | null
}

type SortKey = "name" | "totalHours" | "remainingHours" | "bookingCount" | "daysSinceSecondSession"

const sessionDate = (b: Booking) => b.availability_slots?.date ?? null

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export function AdminMentorship() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slots, setSlots] = useState<AvailSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [savingNotesFor, setSavingNotesFor] = useState<string | null>(null)
  const [bookingFor, setBookingFor] = useState<MentorshipClient | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState("")
  const [bookingError, setBookingError] = useState("")
  const [bookingLoading, setBookingLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subsRes, bookingsRes, slotsRes] = await Promise.all([
        fetch("/api/admin/subscriptions"),
        fetch("/api/admin/bookings"),
        fetch("/api/admin/slots"),
      ])
      const subsData = await subsRes.json()
      const bookingsData = await bookingsRes.json()
      const slotsData = await slotsRes.json()
      if (subsData.subscriptions) setSubs(subsData.subscriptions)
      if (bookingsData.bookings) setBookings(bookingsData.bookings)
      if (slotsData.slots) setSlots(slotsData.slots)
    } catch (e) {
      console.error("Failed to fetch mentorship data:", e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const clients = useMemo(() => {
    const byEmail = new Map<string, MentorshipClient>()
    for (const sub of subs) {
      const email = sub.client_email.toLowerCase().trim()
      const existing = byEmail.get(email)
      const active = sub.status === "active"
      if (existing) {
        existing.plans.push(sub.plan)
        existing.totalHours += sub.total_hours
        existing.usedHours += sub.used_hours
        existing.remainingHours += sub.remaining_hours
        existing.isActive = existing.isActive || active
        existing.hasExpired = existing.hasExpired || sub.status === "expired"
        existing.subIds.push(sub.id)
        if (sub.expires_at && (!existing.latestExpiry || sub.expires_at > existing.latestExpiry)) {
          existing.latestExpiry = sub.expires_at
        }
      } else {
        byEmail.set(email, {
          email,
          name: sub.client_name || email,
          plans: [sub.plan],
          totalHours: sub.total_hours,
          usedHours: sub.used_hours,
          remainingHours: sub.remaining_hours,
          isActive: active,
          hasExpired: sub.status === "expired",
          subIds: [sub.id],
          primarySubId: sub.id,
          notes: sub.notes || "",
          bookings: [],
          bookingCount: 0,
          daysSinceSecondSession: null,
          latestExpiry: sub.expires_at,
        })
      }
    }
    for (const booking of bookings) {
      const email = booking.client_email?.toLowerCase().trim()
      const client = email ? byEmail.get(email) : undefined
      if (client) {
        client.bookings.push(booking)
        client.bookingCount += 1
      }
    }
    const today = new Date()
    for (const client of byEmail.values()) {
      const completedDates = client.bookings
        .filter((b) => b.status === "completed" && sessionDate(b))
        .map((b) => sessionDate(b) as string)
        .sort()
      if (completedDates.length >= 2) {
        const second = new Date(completedDates[1] + "T00:00:00")
        client.daysSinceSecondSession = Math.max(
          0,
          Math.floor((today.getTime() - second.getTime()) / (1000 * 60 * 60 * 24))
        )
      }
    }
    return Array.from(byEmail.values())
  }, [subs, bookings])

  const uniquePlans = useMemo(() => Array.from(new Set(subs.map((s) => s.plan))).sort(), [subs])

  const availableSlots = useMemo(
    () => slots.filter((s) => !s.is_booked).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)),
    [slots]
  )

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = clients.filter((c) => {
      if (q && !c.email.includes(q) && !c.name.toLowerCase().includes(q)) return false
      if (planFilter !== "all" && !c.plans.includes(planFilter)) return false
      if (statusFilter === "active" && !c.isActive) return false
      if (statusFilter === "inactive" && c.isActive) return false
      return true
    })
    const dir = sortDir === "asc" ? 1 : -1
    result = [...result].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir
      if (sortKey === "daysSinceSecondSession") {
        if (a.daysSinceSecondSession === null && b.daysSinceSecondSession === null) return 0
        if (a.daysSinceSecondSession === null) return 1
        if (b.daysSinceSecondSession === null) return -1
        return (a.daysSinceSecondSession - b.daysSinceSecondSession) * dir
      }
      return (a[sortKey] - b[sortKey]) * dir
    })
    return result
  }, [clients, search, planFilter, statusFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <TableHead>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => toggleSort(sortKeyValue)}
      >
        {label}
        {sortKey === sortKeyValue ? (
          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : null}
      </button>
    </TableHead>
  )

  const handleDeactivate = async (client: MentorshipClient) => {
    if (!confirm(`Deactivate all premium access for ${client.name}?`)) return
    setActionLoading(client.email)
    try {
      await Promise.all(
        client.subIds.map((id) =>
          fetch("/api/admin/subscriptions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "cancelled" }),
          })
        )
      )
      await load()
    } catch (e) {
      console.error("Failed to deactivate client:", e)
    }
    setActionLoading(null)
  }

  const handleExpire = async (client: MentorshipClient) => {
    if (!confirm(`Mark all of ${client.name}'s subscriptions as expired?`)) return
    setActionLoading(client.email)
    try {
      await Promise.all(
        client.subIds.map((id) =>
          fetch("/api/admin/subscriptions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "expired" }),
          })
        )
      )
      await load()
    } catch (e) {
      console.error("Failed to expire client:", e)
    }
    setActionLoading(null)
  }

  const handleReactivate = async (client: MentorshipClient) => {
    if (!confirm(`Reactivate ${client.name}'s expired subscription(s)? Any past expiry date will be cleared — set a new one from the subscription row if needed.`)) return
    setActionLoading(client.email)
    try {
      const expiredSubs = subs.filter((s) => client.subIds.includes(s.id) && s.status === "expired")
      await Promise.all(
        expiredSubs.map((s) => {
          const pastExpiry = !!s.expires_at && new Date(s.expires_at) < new Date()
          return fetch("/api/admin/subscriptions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id, status: "active", ...(pastExpiry ? { expires_at: null } : {}) }),
          })
        })
      )
      await load()
    } catch (e) {
      console.error("Failed to reactivate client:", e)
    }
    setActionLoading(null)
  }

  const BOOKING_ERROR_MESSAGES: Record<string, string> = {
    noHoursRemaining: "This client has no remaining mentorship hours.",
    weeklyLimitReached: "This client has reached their weekly session limit.",
  }

  const handleBookSession = async () => {
    if (!bookingFor || !selectedSlotId) return
    const slot = availableSlots.find((s) => s.id === selectedSlotId)
    if (!slot) return
    setBookingLoading(true)
    setBookingError("")
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slot.id,
          client_name: bookingFor.name,
          client_email: bookingFor.email,
          duration: slot.duration,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setBookingError(BOOKING_ERROR_MESSAGES[result.error] || result.error || "Failed to book session.")
        setBookingLoading(false)
        return
      }
      setBookingFor(null)
      setSelectedSlotId("")
      await load()
    } catch (e) {
      console.error("Failed to book session:", e)
      setBookingError("Network error - please try again")
    }
    setBookingLoading(false)
  }

  const handleSaveNotes = async (client: MentorshipClient) => {
    const value = notesDrafts[client.email] ?? client.notes
    setSavingNotesFor(client.email)
    try {
      await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.primarySubId, notes: value }),
      })
      await load()
    } catch (e) {
      console.error("Failed to save notes:", e)
    }
    setSavingNotesFor(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Crown className="h-5 w-5 text-primary" /> Mentorship Clients
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full sm:w-56"
          />
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {uniquePlans.map((plan) => (
                <SelectItem key={plan} value={plan} className="capitalize">{plan.replace(/-/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : visibleClients.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {search || planFilter !== "all" || statusFilter !== "all"
                ? "No mentorship clients match these filters."
                : "No mentorship clients yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-8" />
                  <SortHeader label="Client" sortKeyValue="name" />
                  <TableHead>Plan(s)</TableHead>
                  <SortHeader label="Total Hrs" sortKeyValue="totalHours" />
                  <SortHeader label="Remaining" sortKeyValue="remainingHours" />
                  <SortHeader label="Bookings" sortKeyValue="bookingCount" />
                  <SortHeader label="Days Since 2nd Session" sortKeyValue="daysSinceSecondSession" />
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleClients.map((client) => {
                  const isExpanded = expandedEmail === client.email
                  const sortedBookings = [...client.bookings].sort((a, b) => {
                    const da = sessionDate(a) ?? a.created_at
                    const db = sessionDate(b) ?? b.created_at
                    return db.localeCompare(da)
                  })
                  return (
                    <Fragment key={client.email}>
                      <TableRow className="border-border">
                        <TableCell>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setExpandedEmail(isExpanded ? null : client.email)}
                            aria-label="Toggle session history"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{client.name}</div>
                          <a
                            href={`mailto:${client.email}`}
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3" /> {client.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {client.plans.map((plan, i) => (
                              <Badge key={i} variant="outline" className="capitalize">
                                {plan.replace(/-/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold tabular-nums">{client.totalHours}</TableCell>
                        <TableCell className={`font-mono font-bold tabular-nums ${client.remainingHours <= 1 ? "text-red-400" : "text-emerald-400"}`}>
                          {client.remainingHours}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">{client.bookingCount}</TableCell>
                        <TableCell>
                          {client.daysSinceSecondSession === null ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <span className="font-mono font-medium tabular-nums">{client.daysSinceSecondSession}d</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={client.isActive ? "active" : "inactive"} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {client.latestExpiry ? new Date(client.latestExpiry).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => { setBookingFor(client); setSelectedSlotId(""); setBookingError("") }}
                            >
                              <CalendarPlus className="mr-1 h-3 w-3" /> Book
                            </Button>
                            {client.isActive && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/10"
                                  disabled={actionLoading === client.email}
                                  onClick={() => handleExpire(client)}
                                >
                                  <CalendarX className="mr-1 h-3 w-3" /> Expire
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                                  disabled={actionLoading === client.email}
                                  onClick={() => handleDeactivate(client)}
                                >
                                  <XCircle className="mr-1 h-3 w-3" /> Deactivate
                                </Button>
                              </>
                            )}
                            {client.hasExpired && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/10"
                                disabled={actionLoading === client.email}
                                onClick={() => handleReactivate(client)}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" /> Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="border-border bg-muted/30">
                          <TableCell colSpan={10}>
                            <div className="grid gap-4 py-2 md:grid-cols-2">
                              <div>
                                <p className="mb-2 text-sm font-medium text-foreground">Session history</p>
                                {sortedBookings.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                                ) : (
                                  <div className="max-h-56 overflow-y-auto rounded border border-border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-border">
                                          <TableHead>Date</TableHead>
                                          <TableHead>Time</TableHead>
                                          <TableHead>Duration</TableHead>
                                          <TableHead>Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sortedBookings.map((b) => (
                                          <TableRow key={b.id} className="border-border">
                                            <TableCell className="font-mono text-sm">
                                              {sessionDate(b) ? formatDate(sessionDate(b) as string) : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                              {b.availability_slots ? formatTime(b.availability_slots.start_time) : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm tabular-nums">{b.duration} min</TableCell>
                                            <TableCell>
                                              <StatusPill status={b.status} />
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="mb-2 text-sm font-medium text-foreground">Notes</p>
                                <Textarea
                                  value={notesDrafts[client.email] ?? client.notes}
                                  onChange={(e) => setNotesDrafts((prev) => ({ ...prev, [client.email]: e.target.value }))}
                                  rows={3}
                                  placeholder="Internal notes about this client..."
                                />
                                <Button
                                  size="sm"
                                  className="mt-2"
                                  disabled={savingNotesFor === client.email}
                                  onClick={() => handleSaveNotes(client)}
                                >
                                  <Save className="mr-1 h-3.5 w-3.5" />
                                  {savingNotesFor === client.email ? "Saving..." : "Save Notes"}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog
        open={!!bookingFor}
        onOpenChange={(open) => {
          if (!open) { setBookingFor(null); setSelectedSlotId(""); setBookingError("") }
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Book a session for {bookingFor?.name}</DialogTitle>
            <DialogDescription>{bookingFor?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available slots. Add one in the Availability tab first.
              </p>
            ) : (
              <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                <SelectTrigger><SelectValue placeholder="Select an available slot" /></SelectTrigger>
                <SelectContent>
                  {availableSlots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatDate(s.date)} at {formatTime(s.start_time)} ({s.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {bookingError && <p className="text-sm text-red-400">{bookingError}</p>}
            <Button
              className="w-full"
              disabled={!selectedSlotId || bookingLoading}
              onClick={handleBookSession}
            >
              {bookingLoading ? "Booking..." : "Book Session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
