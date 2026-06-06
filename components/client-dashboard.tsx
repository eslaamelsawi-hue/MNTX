"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Clock, Calendar, Mail, Loader2, CalendarPlus, Video,
  Users, Rss, ExternalLink, Activity, CheckCircle2,
  XCircle, AlertCircle, Award, Star, MessageCircle,
  LayoutDashboard, BookOpen, Repeat, RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { DMChat } from "@/components/chat/dm-chat"
import { SupportChat } from "@/components/chat/support-chat"
import { GroupChat } from "@/components/chat/group-chat"

// ─── Types ────────────────────────────────────────────────────────────────────

type Subscription = {
  id: string
  client_email: string
  client_name: string
  plan: string
  total_hours: number
  used_hours: number
  remaining_hours: number
  status: string
  starts_at: string
  expires_at: string | null
  notes: string | null
  created_at: string
}

type Slot = { date: string; start_time: string; end_time: string }

type BookingRecord = {
  id: string
  client_name: string
  duration: number
  status: string
  created_at: string
  zoom_join_url: string | null
  client_timezone: string | null
  availability_slots: Slot | null
}

type Settings = Record<string, string>

type GroupSession = {
  id: string
  title: string
  description: string | null
  session_date: string
  start_time: string
  end_time: string
  max_participants: number | null
  zoom_join_url: string | null
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isUpcoming(b: BookingRecord): boolean {
  if (!b.availability_slots?.date) return false
  const d = new Date(`${b.availability_slots.date}T${b.availability_slots.start_time || "00:00:00"}`)
  return d > new Date() && b.status !== "cancelled"
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })
}

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? ""
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / 86400000)
}

// ─── Translations ─────────────────────────────────────────────────────────────

const t: Record<"en" | "ar", Record<string, string>> = {
  en: {
    title: "My Portal",
    subtitle: "Your personalized mentorship hub",
    emailPlaceholder: "Enter your email address",
    lookup: "Access My Portal",
    loading: "Loading...",
    notFound: "No subscription found. Make sure you're using the email you registered with.",
    welcome: "Welcome back",
    tabOverview: "Overview",
    tabMentorship: "My Mentorship",
    tabSessions: "My Sessions",
    tabFeed: "Activity",
    tabCommunity: "Community",
    tabWeeklyZoom: "Weekly Zoom",
    remainingHours: "Remaining Hours",
    usedHours: "Used Hours",
    totalHours: "Total Hours",
    nextSession: "Next Session",
    noNextSession: "No upcoming sessions",
    bookSession: "Book a Session",
    joinZoom: "Join Zoom",
    plan: "Plan",
    status: "Status",
    active: "Active",
    expired: "Expired",
    cancelled: "Cancelled",
    expiresOn: "Expires",
    startsOn: "Started",
    hoursProgress: "Hours Used",
    upcomingSessions: "Upcoming Sessions",
    pastSessions: "Past Sessions",
    noUpcoming: "No upcoming sessions booked.",
    noPast: "No past sessions yet.",
    confirmed: "Confirmed",
    completed: "Completed",
    rescheduled: "Rescheduled",
    sessionCancelled: "Cancelled",
    min: "min",
    duration: "Duration",
    date: "Date",
    time: "Time",
    activityFeed: "Recent Activity",
    noActivity: "No activity yet.",
    sessionBooked: "Session Confirmed",
    sessionDone: "Session Completed",
    sessionCancelledFeed: "Session Cancelled",
    planActivated: "Plan Activated",
    communityTitle: "Join the Community",
    communityDesc: "Connect with fellow traders and get support",
    discordTitle: "Discord Community",
    discordDesc: "Join our active Discord server for daily insights, signals, and peer support.",
    discordBtn: "Join Discord",
    telegramTitle: "Telegram Group",
    telegramDesc: "Get real-time alerts and updates directly in our Telegram group.",
    telegramBtn: "Join Telegram",
    weeklyZoomTitle: "Weekly Group Session",
    weeklyZoomDesc: "Every week we host a live group Zoom call for all mentorship members. Join to ask questions, review trades, and learn together.",
    weeklyZoomBtn: "Join Weekly Zoom",
    noZoomLink: "Link not set — contact your mentor for the weekly Zoom details.",
    totalSessions: "Total Sessions",
    subscriptionLabel: "Subscription",
    daysLeft: "days left",
    today: "Today",
    tomorrow: "Tomorrow",
  },
  ar: {
    title: "بوابتي",
    subtitle: "مركز الإرشاد الخاص بك",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    lookup: "الوصول إلى بوابتي",
    loading: "جارٍ التحميل...",
    notFound: "لم يتم العثور على اشتراك. تأكد من استخدام البريد المسجل به.",
    welcome: "مرحباً بعودتك",
    tabOverview: "نظرة عامة",
    tabMentorship: "إرشادي",
    tabSessions: "جلساتي",
    tabFeed: "النشاط",
    tabCommunity: "المجتمع",
    tabWeeklyZoom: "زووم الأسبوعي",
    remainingHours: "الساعات المتبقية",
    usedHours: "الساعات المستخدمة",
    totalHours: "إجمالي الساعات",
    nextSession: "الجلسة القادمة",
    noNextSession: "لا توجد جلسات قادمة",
    bookSession: "احجز جلسة",
    joinZoom: "انضم للزووم",
    plan: "الخطة",
    status: "الحالة",
    active: "نشط",
    expired: "منتهي",
    cancelled: "ملغي",
    expiresOn: "ينتهي",
    startsOn: "بدأ",
    hoursProgress: "الساعات المستخدمة",
    upcomingSessions: "الجلسات القادمة",
    pastSessions: "الجلسات السابقة",
    noUpcoming: "لا توجد جلسات قادمة محجوزة.",
    noPast: "لا توجد جلسات سابقة حتى الآن.",
    confirmed: "مؤكد",
    completed: "مكتمل",
    rescheduled: "مُعاد جدولته",
    sessionCancelled: "ملغي",
    min: "دقيقة",
    duration: "المدة",
    date: "التاريخ",
    time: "الوقت",
    activityFeed: "النشاط الأخير",
    noActivity: "لا يوجد نشاط بعد.",
    sessionBooked: "تأكيد الجلسة",
    sessionDone: "اكتملت الجلسة",
    sessionCancelledFeed: "إلغاء الجلسة",
    planActivated: "تفعيل الخطة",
    communityTitle: "انضم للمجتمع",
    communityDesc: "تواصل مع المتداولين واحصل على الدعم",
    discordTitle: "مجتمع ديسكورد",
    discordDesc: "انضم إلى خادم Discord النشط للحصول على رؤى يومية وإشارات ودعم.",
    discordBtn: "انضم لديسكورد",
    telegramTitle: "مجموعة تيليجرام",
    telegramDesc: "احصل على تنبيهات وتحديثات فورية في مجموعة Telegram.",
    telegramBtn: "انضم لتيليجرام",
    weeklyZoomTitle: "الجلسة الجماعية الأسبوعية",
    weeklyZoomDesc: "كل أسبوع نستضيف مكالمة زووم جماعية مباشرة لجميع أعضاء الإرشاد.",
    weeklyZoomBtn: "انضم للزووم الأسبوعي",
    noZoomLink: "لم يتم تعيين الرابط — تواصل مع مرشدك للحصول على تفاصيل الزووم.",
    totalSessions: "إجمالي الجلسات",
    subscriptionLabel: "الاشتراك",
    daysLeft: "يوم متبقٍ",
    today: "اليوم",
    tomorrow: "غداً",
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, l }: { status: string; l: Record<string, string> }) {
  if (status === "active")
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{l.active}</Badge>
  if (status === "expired")
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{l.expired}</Badge>
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{l.cancelled}</Badge>
}

function SessionStatusBadge({ status, l }: { status: string; l: Record<string, string> }) {
  const map: Record<string, string> = {
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    rescheduled: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  }
  const labels: Record<string, string> = {
    confirmed: l.confirmed,
    completed: l.completed,
    cancelled: l.sessionCancelled,
    rescheduled: l.rescheduled,
  }
  return <Badge className={map[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}>{labels[status] ?? status}</Badge>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientDashboard() {
  let locale: "en" | "ar" = "en"
  try {
    locale = useLocale() as "en" | "ar"
  } catch {
    locale = "en"
  }
  const l = t[locale] ?? t.en
  const isRtl = locale === "ar"

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [looked, setLooked] = useState(false)
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([])
  const [registeredSessionIds, setRegisteredSessionIds] = useState<Set<string>>(new Set())

  // On component mount, restore from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("mentix_user_email")
    const savedRegistrations = localStorage.getItem("mentix_registered_sessions")

    if (savedEmail && savedRegistrations) {
      setEmail(savedEmail)
      setRegisteredSessionIds(new Set(JSON.parse(savedRegistrations)))

      // Fetch fresh session data
      fetch("/api/group-sessions")
        .then(res => res.json())
        .then(data => setGroupSessions(data.sessions ?? []))
        .catch(e => console.error("Failed to fetch sessions:", e))
    }
  }, [])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      const [dashRes, sessionsRes, regsRes] = await Promise.all([
        fetch("/api/user-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }),
        fetch("/api/group-sessions"),
        fetch("/api/group-sessions/user-registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        })
      ])
      const dashData = await dashRes.json()
      const sessionsData = await sessionsRes.json()
      const regsData = await regsRes.json()

      if (dashData.found) {
        setSubscriptions(dashData.subscriptions)
        setBookings(dashData.bookings)
        setSettings(dashData.settings ?? {})
        setGroupSessions(sessionsData.sessions ?? [])
        setRegisteredSessionIds(new Set(regsData.registeredSessionIds ?? []))

        // Save to localStorage
        localStorage.setItem("mentix_user_email", email.trim())
        localStorage.setItem("mentix_registered_sessions", JSON.stringify(regsData.registeredSessionIds ?? []))
      } else {
        setSubscriptions([])
        setBookings([])
        setSettings({})
        setError(l.notFound)
      }
      setLooked(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const activeSub = useMemo(
    () => subscriptions.find((s) => s.status === "active") ?? subscriptions[0],
    [subscriptions]
  )

  const upcomingSessions = useMemo(
    () =>
      bookings
        .filter(isUpcoming)
        .sort((a, b) => {
          const da = a.availability_slots?.date ?? ""
          const db = b.availability_slots?.date ?? ""
          return da.localeCompare(db)
        }),
    [bookings]
  )

  const pastSessions = useMemo(
    () =>
      bookings
        .filter((b) => !isUpcoming(b))
        .sort((a, b) => {
          const da = a.availability_slots?.date ?? a.created_at
          const db = b.availability_slots?.date ?? b.created_at
          return db.localeCompare(da)
        }),
    [bookings]
  )

  const nextSession = upcomingSessions[0] ?? null

  const feedItems = useMemo(() => {
    const items: Array<{
      id: string
      icon: React.ReactNode
      iconBg: string
      title: string
      sub: string
      date: string
    }> = []

    subscriptions.forEach((s) => {
      items.push({
        id: `sub-${s.id}`,
        icon: <Award className="h-4 w-4" />,
        iconBg: "bg-yellow-500/20 text-yellow-400",
        title: `${l.planActivated}: ${s.plan.replace(/-/g, " ")}`,
        sub: `${s.total_hours} ${l.totalHours.toLowerCase()}`,
        date: s.created_at,
      })
    })

    bookings.forEach((b) => {
      const slotDate = b.availability_slots?.date
        ? `${b.availability_slots.date}T${b.availability_slots.start_time || "00:00:00"}`
        : b.created_at

      const title =
        b.status === "completed"
          ? l.sessionDone
          : b.status === "cancelled"
          ? l.sessionCancelledFeed
          : l.sessionBooked

      const iconBg =
        b.status === "completed"
          ? "bg-emerald-500/20 text-emerald-400"
          : b.status === "cancelled"
          ? "bg-red-500/20 text-red-400"
          : "bg-blue-500/20 text-blue-400"

      const icon =
        b.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : b.status === "cancelled" ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <Calendar className="h-4 w-4" />
        )

      items.push({
        id: `booking-${b.id}`,
        icon,
        iconBg,
        title,
        sub: b.availability_slots?.date
          ? `${fmtDate(b.availability_slots.date)} • ${fmtTime(b.availability_slots.start_time)} • ${b.duration} ${l.min}`
          : `${b.duration} ${l.min}`,
        date: slotDate,
      })
    })

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [bookings, subscriptions, l])

  // ── Gate ──────────────────────────────────────────────────────────────────

  if (!looked || subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex flex flex-col items-center justify-center px-4 py-20" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-full max-w-md">
          {/* Icon & Title */}
          <div className="text-center mb-12">
            <div className="mx-auto mb-6 inline-flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl blur-2xl opacity-20"></div>
                <div className="relative h-20 w-20 flex items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur">
                  <LayoutDashboard className="h-10 w-10 text-amber-400" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{l.title}</h1>
            <p className="text-slate-400 text-lg">{l.subtitle}</p>
          </div>

          {/* Form Card */}
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-lg shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <form onSubmit={handleLookup} className="space-y-5">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 to-orange-500/0 group-focus-within:from-amber-500/10 group-focus-within:to-orange-500/10 rounded-lg transition duration-300"></div>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 h-5 w-5 text-slate-500 group-focus-within:text-amber-400 transition" />
                    <Input
                      type="email"
                      placeholder={l.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg transition"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base rounded-lg transition duration-300 shadow-lg hover:shadow-amber-500/20"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{l.loading}</>
                  ) : (
                    l.lookup
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur p-4 text-sm text-red-400 animate-in fade-in">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  const userName = activeSub?.client_name ?? ""
  const hoursUsedPct = activeSub
    ? Math.min(100, (activeSub.used_hours / activeSub.total_hours) * 100)
    : 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-10" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{l.welcome}</p>
          <h1 className="text-3xl font-bold">{userName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
        </div>
        <Link href={`/${locale}/booking`}>
          <Button className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            {l.bookSession}
          </Button>
        </Link>
      </div>

      {/* Stats strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-muted-foreground">{l.remainingHours}</p>
            <p className={`mt-1 text-2xl font-bold ${(activeSub?.remaining_hours ?? 0) <= 1 ? "text-red-400" : "text-emerald-400"}`}>
              {activeSub?.remaining_hours ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-muted-foreground">{l.usedHours}</p>
            <p className="mt-1 text-2xl font-bold text-orange-400">{activeSub?.used_hours ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-muted-foreground">{l.totalSessions}</p>
            <p className="mt-1 text-2xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-muted-foreground">{l.status}</p>
            <div className="mt-1">
              <StatusBadge status={activeSub?.status ?? "expired"} l={l} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <LayoutDashboard className="h-3.5 w-3.5" />{l.tabOverview}
          </TabsTrigger>
          <TabsTrigger value="mentorship" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />{l.tabMentorship}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5" />{l.tabSessions}
          </TabsTrigger>
          <TabsTrigger value="feed" className="gap-1.5 text-xs sm:text-sm">
            <Rss className="h-3.5 w-3.5" />{l.tabFeed}
          </TabsTrigger>
          <TabsTrigger value="community" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />{l.tabCommunity}
          </TabsTrigger>
          <TabsTrigger value="weekly-zoom" className="gap-1.5 text-xs sm:text-sm">
            <Repeat className="h-3.5 w-3.5" />{l.tabWeeklyZoom}
          </TabsTrigger>
          <TabsTrigger value="chats" className="gap-1.5 text-xs sm:text-sm">
            <MessageCircle className="h-3.5 w-3.5" />Chats
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Next session */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" />
                  {l.nextSession}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextSession && nextSession.availability_slots ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xl font-semibold">{fmtDate(nextSession.availability_slots.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {fmtTime(nextSession.availability_slots.start_time)} — {fmtTime(nextSession.availability_slots.end_time)} • {nextSession.duration} {l.min}
                      </p>
                    </div>
                    {(() => {
                      const days = daysUntil(nextSession.availability_slots.date)
                      return (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {days === 0 ? l.today : days === 1 ? l.tomorrow : `${days} ${l.daysLeft}`}
                        </Badge>
                      )
                    })()}
                    {nextSession.zoom_join_url && (
                      <a href={nextSession.zoom_join_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="gap-2 w-full mt-1">
                          <Video className="h-4 w-4" />{l.joinZoom}
                        </Button>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    <Calendar className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm">{l.noNextSession}</p>
                    <Link href={`/${locale}/booking`} className="mt-2 inline-block">
                      <Button size="sm" variant="outline" className="gap-1.5 mt-1">
                        <CalendarPlus className="h-3.5 w-3.5" />{l.bookSession}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hours card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  {l.hoursProgress}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSub ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{activeSub.used_hours} / {activeSub.total_hours} {l.totalHours.toLowerCase()}</span>
                      <span className="font-medium">{Math.round(hoursUsedPct)}%</span>
                    </div>
                    <Progress value={hoursUsedPct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{l.remainingHours}: <strong className={activeSub.remaining_hours <= 1 ? "text-red-400" : "text-emerald-400"}>{activeSub.remaining_hours}</strong></span>
                      {activeSub.expires_at && (
                        <span>{l.expiresOn}: {new Date(activeSub.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent sessions preview */}
          {upcomingSessions.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">{l.upcomingSessions}</h3>
              <div className="space-y-2">
                {upcomingSessions.slice(0, 3).map((b) => (
                  <Card key={b.id} className="border-border bg-card">
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{b.availability_slots ? fmtDate(b.availability_slots.date) : "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.availability_slots ? fmtTime(b.availability_slots.start_time) : ""} • {b.duration} {l.min}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SessionStatusBadge status={b.status} l={l} />
                        {b.zoom_join_url && (
                          <a href={b.zoom_join_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                              <Video className="h-3 w-3" />{l.joinZoom}
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── My Mentorship ── */}
        <TabsContent value="mentorship" className="space-y-4">
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize text-lg">{sub.plan.replace(/-/g, " ")}</CardTitle>
                  <StatusBadge status={sub.status} l={l} />
                </div>
                {sub.notes && <CardDescription>{sub.notes}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{l.totalHours}</p>
                    <p className="mt-1 text-2xl font-bold">{sub.total_hours}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{l.usedHours}</p>
                    <p className="mt-1 text-2xl font-bold text-orange-400">{sub.used_hours}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{l.remainingHours}</p>
                    <p className={`mt-1 text-2xl font-bold ${sub.remaining_hours <= 1 ? "text-red-400" : "text-emerald-400"}`}>
                      {sub.remaining_hours}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{l.hoursProgress}</span>
                    <span>{Math.round(Math.min(100, (sub.used_hours / sub.total_hours) * 100))}%</span>
                  </div>
                  <Progress value={Math.min(100, (sub.used_hours / sub.total_hours) * 100)} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{l.startsOn}</p>
                    <p className="font-medium">{new Date(sub.starts_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{l.expiresOn}</p>
                    <p className="font-medium">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Link href={`/${locale}/booking`}>
            <Button className="w-full gap-2">
              <CalendarPlus className="h-4 w-4" />{l.bookSession}
            </Button>
          </Link>
        </TabsContent>

        {/* ── My Sessions ── */}
        <TabsContent value="sessions" className="space-y-6">
          {/* Upcoming */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Calendar className="h-4 w-4 text-primary" />{l.upcomingSessions}
                <Badge variant="secondary">{upcomingSessions.length}</Badge>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLookup({ preventDefault: () => {} } as any)}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
            {upcomingSessions.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">{l.noUpcoming}</p>
                  <Link href={`/${locale}/booking`} className="mt-2 inline-block">
                    <Button size="sm" variant="outline" className="gap-1.5 mt-1">
                      <CalendarPlus className="h-3.5 w-3.5" />{l.bookSession}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((b) => (
                  <Card key={b.id} className="border-border bg-card border-l-2 border-l-primary">
                    <CardContent className="py-4 px-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {b.availability_slots ? fmtDate(b.availability_slots.date) : "—"}
                            </span>
                            {b.availability_slots && (() => {
                              const days = daysUntil(b.availability_slots.date)
                              return (
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                                  {days === 0 ? l.today : days === 1 ? l.tomorrow : `${days} ${l.daysLeft}`}
                                </Badge>
                              )
                            })()}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {b.availability_slots ? `${fmtTime(b.availability_slots.start_time)} — ${fmtTime(b.availability_slots.end_time)}` : ""}
                            </span>
                            <span>{b.duration} {l.min}</span>
                            {b.client_timezone && <span className="text-xs opacity-60">{b.client_timezone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SessionStatusBadge status={b.status} l={l} />
                          {b.zoom_join_url && (
                            <a href={b.zoom_join_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="gap-1.5">
                                <Video className="h-3.5 w-3.5" />{l.joinZoom}
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" />{l.pastSessions}
              <Badge variant="secondary">{pastSessions.length}</Badge>
            </h3>
            {pastSessions.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">{l.noPast}</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pastSessions.map((b) => (
                  <Card key={b.id} className="border-border bg-card opacity-80">
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{b.availability_slots ? fmtDate(b.availability_slots.date) : "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.availability_slots ? fmtTime(b.availability_slots.start_time) : ""} • {b.duration} {l.min}
                          </p>
                        </div>
                      </div>
                      <SessionStatusBadge status={b.status} l={l} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Feed / Activity ── */}
        <TabsContent value="feed">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Rss className="h-4 w-4 text-primary" />{l.activityFeed}
          </h3>
          {feedItems.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">{l.noActivity}</CardContent>
            </Card>
          ) : (
            <div className="relative space-y-0">
              {feedItems.map((item, i) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    {i < feedItems.length - 1 && <div className="mt-1 flex-1 border-l border-border" />}
                  </div>
                  <div className="pb-6 pt-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      {new Date(item.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Community ── */}
        <TabsContent value="community" className="space-y-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{l.communityTitle}</h3>
              <p className="text-sm text-muted-foreground">{l.communityDesc}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLookup({ preventDefault: () => {} } as any)}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Discord */}
            <Card className="border-border bg-card hover:border-indigo-500/50 transition-colors">
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
                  <MessageCircle className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-semibold">{l.discordTitle}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{l.discordDesc}</p>
                </div>
                {settings.discord_invite ? (
                  <a href={settings.discord_invite} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2 w-full">
                      <ExternalLink className="h-4 w-4" />{l.discordBtn}
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" className="gap-2 w-full" disabled>
                    <ExternalLink className="h-4 w-4" />{l.discordBtn}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Telegram */}
            <Card className="border-border bg-card hover:border-sky-500/50 transition-colors">
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
                  <Star className="h-6 w-6 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-semibold">{l.telegramTitle}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{l.telegramDesc}</p>
                </div>
                {settings.telegram_group ? (
                  <a href={settings.telegram_group} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2 w-full">
                      <ExternalLink className="h-4 w-4" />{l.telegramBtn}
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" className="gap-2 w-full" disabled>
                    <ExternalLink className="h-4 w-4" />{l.telegramBtn}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Chats ── */}
        <TabsContent value="chats" className="space-y-6">
          <div className="space-y-6">
            {email && (
              <>
                <DMChat userEmail={email} mentorId="1" />
                <SupportChat userEmail={email} userName={subscriptions[0]?.client_name || "User"} />
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Weekly Zoom ── */}
        <TabsContent value="weekly-zoom" className="space-y-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{l.weeklyZoomTitle}</h3>
              <p className="text-slate-400">{l.weeklyZoomDesc}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetch("/api/group-sessions")
                  .then(res => res.json())
                  .then(data => setGroupSessions(data.sessions ?? []))
                  .catch(e => console.error("Failed to refresh:", e))
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          {groupSessions.length === 0 ? (
            <Card className="border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-800/50">
              <CardContent className="py-16 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-blue-500/10">
                    <Video className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <p className="text-slate-300 text-lg font-medium mb-2">No upcoming sessions</p>
                <p className="text-slate-500">Check back soon for scheduled group sessions!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {groupSessions.map((session) => {
                const isRegistered = registeredSessionIds.has(session.id)
                const sessionDate = new Date(session.session_date)
                const daysAway = Math.ceil((sessionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <Card key={session.id} className="border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/40 hover:border-blue-500/50 transition overflow-hidden group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="p-3 rounded-lg bg-blue-500/20 mt-0.5 shrink-0">
                              <Video className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition">{session.title}</h4>
                              {session.description && <p className="text-sm text-slate-400 mb-3">{session.description}</p>}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Calendar className="w-4 h-4 text-blue-400" />
                              <span className="font-medium">{sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Clock className="w-4 h-4 text-blue-400" />
                              <span className="font-medium">{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                            </div>
                            {session.max_participants && (
                              <div className="flex items-center gap-2 text-slate-300">
                                <Users className="w-4 h-4 text-blue-400" />
                                <span className="font-medium">Max {session.max_participants}</span>
                              </div>
                            )}
                            {daysAway === 0 && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Today</Badge>}
                            {daysAway === 1 && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Tomorrow</Badge>}
                            {daysAway > 1 && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{daysAway} days</Badge>}
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
                          {session.zoom_join_url && isRegistered && (
                            <a href={session.zoom_join_url} target="_blank" rel="noopener noreferrer" className="block">
                              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                                <Video className="w-4 h-4" />
                                Join Now
                              </Button>
                            </a>
                          )}
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/group-sessions/register", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    session_id: session.id,
                                    client_email: email,
                                    client_name: activeSub?.client_name || email.split("@")[0],
                                    zoom_url: session.zoom_join_url,
                                    session_title: session.title,
                                    session_date: session.session_date,
                                    start_time: session.start_time,
                                    end_time: session.end_time,
                                  })
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error)
                                const newRegistrations = new Set([...registeredSessionIds, session.id])
                                setRegisteredSessionIds(newRegistrations)
                                localStorage.setItem("mentix_registered_sessions", JSON.stringify(Array.from(newRegistrations)))
                                alert("✅ Registered! Confirmation email sent.")
                              } catch (e) {
                                alert("❌ " + (e instanceof Error ? e.message : "Failed to register"))
                              }
                            }}
                            disabled={isRegistered}
                            variant={isRegistered ? "secondary" : "default"}
                            className={isRegistered ? "bg-slate-700 text-slate-300 cursor-default" : "bg-blue-600 hover:bg-blue-700"}
                          >
                            {isRegistered ? "✓ Registered" : "Register"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Group Chat for Selected Session */}
          {groupSessions.length > 0 && email && (
            <GroupChat
              sessionId={groupSessions[0]?.id || ""}
              userEmail={email}
              userName={subscriptions[0]?.client_name || "User"}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
