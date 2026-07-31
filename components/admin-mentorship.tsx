"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Crown, RefreshCw, Users, XCircle } from "lucide-react"

type Sub = {
  id: string; client_email: string; client_name: string; plan: string
  total_hours: number; used_hours: number; remaining_hours: number
  status: string; starts_at: string; expires_at: string | null; notes: string | null; created_at: string
}

type Booking = { client_email: string }

type MentorshipClient = {
  email: string
  name: string
  plans: string[]
  totalHours: number
  usedHours: number
  remainingHours: number
  isActive: boolean
  subIds: string[]
  bookingCount: number
  latestExpiry: string | null
}

export function AdminMentorship() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subsRes, bookingsRes] = await Promise.all([
        fetch("/api/admin/subscriptions"),
        fetch("/api/admin/bookings"),
      ])
      const subsData = await subsRes.json()
      const bookingsData = await bookingsRes.json()
      if (subsData.subscriptions) setSubs(subsData.subscriptions)
      if (bookingsData.bookings) setBookings(bookingsData.bookings)
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
          subIds: [sub.id],
          bookingCount: 0,
          latestExpiry: sub.expires_at,
        })
      }
    }
    for (const booking of bookings) {
      const email = booking.client_email?.toLowerCase().trim()
      const client = email ? byEmail.get(email) : undefined
      if (client) client.bookingCount += 1
    }
    return Array.from(byEmail.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [subs, bookings])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.email.includes(q) || c.name.toLowerCase().includes(q))
  }, [clients, search])

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Crown className="h-5 w-5 text-primary" /> Mentorship Clients
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="sm:w-64"
          />
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {search ? `No mentorship clients match "${search}".` : "No mentorship clients yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Client</TableHead>
                  <TableHead>Plan(s)</TableHead>
                  <TableHead>Total Hrs</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.email} className="border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">{client.name}</div>
                      <div className="text-sm text-muted-foreground">{client.email}</div>
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
                    <TableCell className="font-bold">{client.totalHours}</TableCell>
                    <TableCell className={`font-bold ${client.remainingHours <= 1 ? "text-red-400" : "text-emerald-400"}`}>
                      {client.remainingHours}
                    </TableCell>
                    <TableCell>{client.bookingCount}</TableCell>
                    <TableCell>
                      <Badge className={client.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}>
                        {client.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {client.latestExpiry ? new Date(client.latestExpiry).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                          disabled={actionLoading === client.email}
                          onClick={() => handleDeactivate(client)}
                        >
                          <XCircle className="mr-1 h-3 w-3" /> Deactivate
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
    </div>
  )
}
