"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Clock, Package, Calendar, Mail, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { useLocale } from "next-intl"

type Subscription = {
  id: string; client_email: string; client_name: string; plan: string
  total_hours: number; used_hours: number; remaining_hours: number
  status: string; starts_at: string; expires_at: string | null
  notes: string | null; created_at: string
}

type BookingRecord = {
  id: string; client_name: string; duration: number; status: string; created_at: string
  availability_slots: { date: string; start_time: string; end_time: string } | null
}

const translations: Record<string, Record<string, string>> = {
  en: {
    title: "My Dashboard",
    subtitle: "View your subscription details and session history",
    emailPlaceholder: "Enter your email address",
    lookupBtn: "View My Dashboard",
    loading: "Looking up...",
    noSub: "No subscription found for this email. Make sure you are using the same email you registered with.",
    plan: "Plan",
    totalHours: "Total Hours",
    usedHours: "Used Hours",
    remainingHours: "Remaining Hours",
    active: "Active",
    expired: "Expired",
    cancelled: "Cancelled",
    startDate: "Start Date",
    expiryDate: "Expiry Date",
    sessionHistory: "Session History",
    noSessions: "No sessions booked yet",
    confirmed: "Confirmed",
    completed: "Completed",
    min: "min",
    subscriptions: "Your Subscriptions",
    sessionNotice: "Each session is 1 hour per week (4 hours/month). Taking 2 sessions/week or exceeding 1 hour counts as multiple sessions.",
  },
  ar: {
    title: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
    subtitle: "\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u0648\u0633\u062c\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a",
    emailPlaceholder: "\u0623\u062f\u062e\u0644 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
    lookupBtn: "\u0639\u0631\u0636 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
    loading: "\u062c\u0627\u0631\u064a \u0627\u0644\u0628\u062d\u062b...",
    noSub: "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f. \u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0646\u0641\u0633 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0630\u064a \u0633\u062c\u0644\u062a \u0628\u0647.",
    plan: "\u0627\u0644\u062e\u0637\u0629",
    totalHours: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0627\u0639\u0627\u062a",
    usedHours: "\u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629",
    remainingHours: "\u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629",
    active: "\u0646\u0634\u0637",
    expired: "\u0645\u0646\u062a\u0647\u064a",
    cancelled: "\u0645\u0644\u063a\u064a",
    startDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629",
    expiryDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621",
    sessionHistory: "\u0633\u062c\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a",
    noSessions: "\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a \u0645\u062d\u062c\u0648\u0632\u0629 \u0628\u0639\u062f",
    confirmed: "\u0645\u0624\u0643\u062f",
    completed: "\u0645\u0643\u062a\u0645\u0644",
    min: "\u062f\u0642\u064a\u0642\u0629",
    subscriptions: "\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a\u0643",
    sessionNotice: "\u0643\u0644 \u062c\u0644\u0633\u0629 \u0645\u062f\u062a\u0647\u0627 \u0633\u0627\u0639\u0629 \u0641\u064a \u0627\u0644\u0623\u0633\u0628\u0648\u0639 (4 \u0633\u0627\u0639\u0627\u062a/\u0634\u0647\u0631). \u062c\u0644\u0633\u062a\u064a\u0646 \u0641\u064a \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0623\u0648 \u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u0633\u0627\u0639\u0629 \u064a\u062d\u062a\u0633\u0628 \u0643\u062c\u0644\u0633\u0627\u062a \u0645\u062a\u0639\u062f\u062f\u0629.",
  },
}

export function UserDashboard() {
  const locale = useLocale() as "en" | "ar"
  const l = translations[locale] || translations.en
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [looked, setLooked] = useState(false)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/user-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.found) {
        setSubscriptions(data.subscriptions)
        setBookings(data.bookings)
      } else {
        setSubscriptions([])
        setBookings([])
        setError(l.noSub)
      }
      setLooked(true)
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (s: string) => {
    if (s === "active") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{l.active}</Badge>
    if (s === "expired") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{l.expired}</Badge>
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{l.cancelled}</Badge>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold text-foreground">{l.title}</h1>
        <p className="text-muted-foreground">{l.subtitle}</p>
      </div>

      <Card className="mb-8 border-border bg-card">
        <CardContent className="pt-6">
          <form onSubmit={handleLookup} className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder={l.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {l.loading}</> : l.lookupBtn}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">{error}</div>}

      {looked && subscriptions.length === 0 && !error && (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">{l.noSub}</CardContent>
        </Card>
      )}

      {subscriptions.length > 0 && (
        <>
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
            {l.sessionNotice}
          </div>

          <h2 className="mb-4 text-xl font-semibold">{l.subscriptions}</h2>
          <div className="space-y-4 mb-8">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold capitalize">{sub.plan.replace(/-/g, " ")}</h3>
                    {statusBadge(sub.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">{l.totalHours}</div>
                      <div className="mt-1 text-2xl font-bold">{sub.total_hours}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">{l.usedHours}</div>
                      <div className="mt-1 text-2xl font-bold text-orange-400">{sub.used_hours}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">{l.remainingHours}</div>
                      <div className={`mt-1 text-2xl font-bold ${sub.remaining_hours <= 1 ? "text-red-400" : "text-emerald-400"}`}>{sub.remaining_hours}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">{l.expiryDate}</div>
                      <div className="mt-1 text-sm font-medium">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "-"}</div>
                    </div>
                  </div>

                  {sub.notes && <p className="mt-3 text-sm text-muted-foreground">{sub.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="mb-4 text-xl font-semibold">{l.sessionHistory}</h2>
          {bookings.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-8 text-center text-muted-foreground">{l.noSessions}</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <Card key={b.id} className="border-border bg-card">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(b.booking_date).toLocaleDateString()}</span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{b.start_time?.slice(0,5)} - {b.end_time?.slice(0,5)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{b.duration} {l.min}</span>
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status === "confirmed" ? l.confirmed : l.completed}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  )
}
