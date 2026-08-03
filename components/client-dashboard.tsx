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
  GraduationCap, Settings, Lock, Crown, ChevronsUpDown,
  Receipt, TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { GroupChat } from "@/components/chat/group-chat"
import { DashboardAcademy } from "@/components/course/dashboard-academy"
import { DashboardSettings } from "@/components/dashboard-settings"
import { DashboardRecordings } from "@/components/dashboard-recordings"
import { DashboardInvoices } from "@/components/dashboard-invoices"
import { DashboardProgress } from "@/components/dashboard-progress"
import { NotificationBell } from "@/components/notification-bell"
import BookingCalendar from "@/components/booking-calendar"
import { StatusPill } from "@/components/status-pill"

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
    tabBooking: "Book Session",
    tabProgress: "Progress",
    tabPayments: "Payments",
    progressSubtitle: "Your mentorship activity over time.",
    progressNoData: "Not enough data yet — it'll fill in as you complete sessions.",
    hoursOverTime: "Hours used over time",
    sessionsPerMonth: "Sessions per month",
    lockedTitle: "Premium coaching content",
    lockedDesc: "This is part of the 1-on-1 mentorship program. Get a coaching plan to unlock your hours, private sessions, and weekly group calls.",
    lockedCta: "Join the mentorship",
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
    tabBooking: "احجز جلسة",
    tabProgress: "التقدم",
    tabPayments: "المدفوعات",
    progressSubtitle: "نشاطك في برنامج الإرشاد عبر الوقت.",
    progressNoData: "لا توجد بيانات كافية بعد — ستظهر تدريجيًا مع إتمام الجلسات.",
    hoursOverTime: "الساعات المستخدمة عبر الوقت",
    sessionsPerMonth: "الجلسات لكل شهر",
    lockedTitle: "محتوى إرشاد مميّز",
    lockedDesc: "هذا جزء من برنامج الإرشاد الفردي. احصل على خطة إرشاد لفتح ساعاتك وجلساتك الخاصة والمكالمات الجماعية الأسبوعية.",
    lockedCta: "انضم للإرشاد",
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
  const label = status === "active" ? l.active : status === "expired" ? l.expired : l.cancelled
  return <StatusPill status={status} label={label} />
}

function SessionStatusBadge({ status, l }: { status: string; l: Record<string, string> }) {
  const labels: Record<string, string> = {
    confirmed: l.confirmed,
    completed: l.completed,
    cancelled: l.sessionCancelled,
    rescheduled: l.rescheduled,
  }
  return <StatusPill status={status} label={labels[status] ?? status} />
}

// Shown in place of coaching-only tabs when the member has no active subscription.
function LockedPanel({ l, locale }: { l: Record<string, string>; locale: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-bold text-foreground">{l.lockedTitle}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{l.lockedDesc}</p>
      <Link href={`/${locale}/checkout?plan=coaching`} className="mt-6">
        <Button className="gap-2">
          <Crown className="h-4 w-4" />
          {l.lockedCta}
        </Button>
      </Link>
    </div>
  )
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
  const [name, setName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("academy")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [looked, setLooked] = useState(false)
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([])
  const [registeredSessionIds, setRegisteredSessionIds] = useState<Set<string>>(new Set())
  const [hiddenSessionChats, setHiddenSessionChats] = useState<Set<string>>(new Set())

  // Core lookup by email — used both by the auto-login flow and the fallback form.
  const runLookup = async (targetEmail: string) => {
    const em = targetEmail.trim()
    if (!em) return
    setLoading(true)
    setError("")
    try {
      const [dashRes, sessionsRes, regsRes] = await Promise.all([
        fetch("/api/user-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: em }),
        }),
        fetch("/api/group-sessions"),
        fetch("/api/group-sessions/user-registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: em }),
        })
      ])
      const dashData = await dashRes.json()
      const sessionsData = await sessionsRes.json()
      const regsData = await regsRes.json()

      setGroupSessions(sessionsData.sessions ?? [])
      if (dashData.found) {
        setSubscriptions(dashData.subscriptions)
        setBookings(dashData.bookings)
        setSettings(dashData.settings ?? {})
        setRegisteredSessionIds(new Set(regsData.registeredSessionIds ?? []))
        localStorage.setItem("mentix_user_email", em)
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

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    await runLookup(email)
  }

  // On mount: use the logged-in account's email automatically (this page requires
  // login), falling back to a previously saved email.
  useEffect(() => {
    const savedRegs = localStorage.getItem("mentix_registered_sessions")
    if (savedRegs) setRegisteredSessionIds(new Set(JSON.parse(savedRegs)))
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setAvatarUrl((data.user?.user_metadata?.avatar_url as string) || null)
      setName((data.user?.user_metadata?.first_name || data.user?.user_metadata?.full_name || "") as string)
      const sessionEmail = data.user?.email || localStorage.getItem("mentix_user_email") || ""
      if (sessionEmail) {
        setEmail(sessionEmail)
        runLookup(sessionEmail)
      } else {
        setLooked(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Still loading the account lookup → spinner.
  if (!looked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir={isRtl ? "rtl" : "ltr"}>
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  // Everyone gets the same dashboard; coaching-only tabs are locked for members
  // without an active subscription.

  const hasCoaching = subscriptions.length > 0
  const userName = activeSub?.client_name ?? ""
  const displayName = userName || email.split("@")[0] || "Member"
  const initials = displayName.trim().slice(0, 2).toUpperCase()
  const navItemCls =
    "w-auto shrink-0 justify-start gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm lg:w-full"
  const hoursUsedPct = activeSub
    ? Math.min(100, (activeSub.used_hours / activeSub.total_hours) * 100)
    : 0

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="min-h-screen bg-background"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="shrink-0 border-b border-border bg-card/40 p-3 lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-e lg:border-border lg:p-4">
          {/* Account chip */}
          <div className="mb-2 flex items-center gap-3 rounded-xl px-1.5 py-1.5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-600 text-sm font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
              <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          <div className="mb-2 hidden h-px w-full bg-border lg:block" />

          <TabsList className="flex h-auto w-full gap-0.5 overflow-x-auto bg-transparent p-0 lg:flex-col">
            <TabsTrigger value="academy" className={navItemCls}>
              <GraduationCap className="h-[18px] w-[18px]" />{isRtl ? "دوراتي" : "My Courses"}
            </TabsTrigger>

            <div className="my-1.5 hidden h-px w-full bg-border lg:block" />

            <TabsTrigger value="overview" className={navItemCls}>
              <LayoutDashboard className="h-[18px] w-[18px]" />{l.tabOverview}
            </TabsTrigger>
            <TabsTrigger value="mentorship" className={navItemCls}>
              <BookOpen className="h-[18px] w-[18px]" />{l.tabMentorship}
            </TabsTrigger>
            <TabsTrigger value="progress" className={navItemCls}>
              <TrendingUp className="h-[18px] w-[18px]" />{l.tabProgress}
            </TabsTrigger>
            <TabsTrigger value="sessions" className={navItemCls}>
              <Calendar className="h-[18px] w-[18px]" />{l.tabSessions}
            </TabsTrigger>
            <TabsTrigger value="booking" className={navItemCls}>
              <CalendarPlus className="h-[18px] w-[18px]" />{l.tabBooking}
            </TabsTrigger>

            <div className="my-1.5 hidden h-px w-full bg-border lg:block" />

            <TabsTrigger value="recordings" className={navItemCls}>
              <Video className="h-[18px] w-[18px]" />{isRtl ? "التسجيلات" : "Recordings"}
            </TabsTrigger>
            <TabsTrigger value="feed" className={navItemCls}>
              <Rss className="h-[18px] w-[18px]" />{l.tabFeed}
            </TabsTrigger>
            <TabsTrigger value="community" className={navItemCls}>
              <Users className="h-[18px] w-[18px]" />{l.tabCommunity}
            </TabsTrigger>
            <TabsTrigger value="weekly-zoom" className={navItemCls}>
              <Repeat className="h-[18px] w-[18px]" />{l.tabWeeklyZoom}
            </TabsTrigger>

            <div className="my-1.5 hidden h-px w-full bg-border lg:block" />

            <TabsTrigger value="payments" className={navItemCls}>
              <Receipt className="h-[18px] w-[18px]" />{l.tabPayments}
            </TabsTrigger>
            <TabsTrigger value="settings" className={navItemCls}>
              <Settings className="h-[18px] w-[18px]" />{isRtl ? "الإعدادات" : "Settings"}
            </TabsTrigger>
          </TabsList>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          {/* Top bar */}
          <div className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{l.welcome}</p>
                <h1 className="mt-0.5 text-2xl font-bold text-foreground sm:text-3xl">{displayName}</h1>
              </div>
              <div className="flex items-center gap-3">
                {hasCoaching && ["overview", "mentorship", "sessions"].includes(activeTab) && (
                  <StatusBadge status={activeSub?.status ?? "expired"} l={l} />
                )}
                <NotificationBell onNavigate={setActiveTab} />
              </div>
            </div>
          </div>

        {/* ── Academy ── */}
        <TabsContent value="academy" className="space-y-4">
          <DashboardAcademy email={email} />
        </TabsContent>

        {/* ── Progress ── */}
        <TabsContent value="progress" className="space-y-4">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : <DashboardProgress subscriptions={subscriptions} bookings={bookings} l={l} />}
        </TabsContent>

        {/* ── Book a 1-on-1 Session ── */}
        <TabsContent value="booking" className="space-y-4">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : <BookingCalendar defaultEmail={email} defaultName={name} lockEmail />}
        </TabsContent>

        {/* ── Recordings ── */}
        <TabsContent value="recordings" className="space-y-4">
          <DashboardRecordings email={email} />
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments" className="space-y-4">
          <DashboardInvoices email={email} />
        </TabsContent>

        {/* ── Settings ── */}
        <TabsContent value="settings" className="space-y-4">
          <DashboardSettings />
        </TabsContent>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : (<>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock className="h-3.5 w-3.5" /></span>
                {l.remainingHours}
              </div>
              <p className={`mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight ${(activeSub?.remaining_hours ?? 0) <= 1 ? "text-red-400" : "text-foreground"}`}>{activeSub?.remaining_hours ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Activity className="h-3.5 w-3.5" /></span>
                {l.usedHours}
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">{activeSub?.used_hours ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Calendar className="h-3.5 w-3.5" /></span>
                {l.totalSessions}
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">{bookings.length}</p>
            </div>
          </div>
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
          </>)}
        </TabsContent>

        {/* ── My Mentorship ── */}
        <TabsContent value="mentorship" className="space-y-4">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : (<>
          {subscriptions.map((sub) => {
            const usedPct = Math.min(100, Math.round((sub.used_hours / Math.max(1, sub.total_hours)) * 100))
            const low = sub.remaining_hours <= 1
            const C = 2 * Math.PI * 52
            return (
              <Card key={sub.id} className="overflow-hidden border-border bg-card">
                {/* Header strip */}
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold capitalize text-foreground">{sub.plan.replace(/-/g, " ")}</h3>
                      <p className="truncate text-xs text-muted-foreground">{sub.notes || l.tabMentorship}</p>
                    </div>
                  </div>
                  <StatusBadge status={sub.status} l={l} />
                </div>

                <CardContent className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
                  {/* Hours ring */}
                  <div className="relative mx-auto h-32 w-32 shrink-0">
                    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-muted" />
                      <circle
                        cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round"
                        className="stroke-primary transition-all duration-700"
                        strokeDasharray={C}
                        strokeDashoffset={C * (1 - usedPct / 100)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-bold leading-none ${low ? "text-red-400" : "text-foreground"}`}>{sub.remaining_hours}</span>
                      <span className="mt-1 text-[11px] text-muted-foreground">{isRtl ? "ساعة متبقية" : "hrs left"}</span>
                    </div>
                  </div>

                  {/* Stats + progress + dates */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">{l.totalHours}</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{sub.total_hours}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">{l.usedHours}</p>
                        <p className="mt-1 text-xl font-bold text-amber-400">{sub.used_hours}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">{l.remainingHours}</p>
                        <p className={`mt-1 text-xl font-bold ${low ? "text-red-400" : "text-emerald-400"}`}>{sub.remaining_hours}</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                        <span>{l.hoursProgress}</span>
                        <span className="font-medium text-foreground">{usedPct}%</span>
                      </div>
                      <Progress value={usedPct} className="h-2" />
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{l.startsOn}:</span>
                        <span className="font-medium">{new Date(sub.starts_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{l.expiresOn}:</span>
                        <span className="font-medium">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </>)}
        </TabsContent>

        {/* ── My Sessions ── */}
        <TabsContent value="sessions" className="space-y-6">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : (<>
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
          </>)}
        </TabsContent>

        {/* ── Feed / Activity ── */}
        <TabsContent value="feed">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : (<>
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
          </>)}
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

        {/* ── Weekly Zoom ── */}
        <TabsContent value="weekly-zoom" className="space-y-4">
          {!hasCoaching ? <LockedPanel l={l} locale={locale} /> : (<>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="mb-1 text-2xl font-bold text-foreground">{l.weeklyZoomTitle}</h3>
              <p className="text-muted-foreground">{l.weeklyZoomDesc}</p>
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
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <p className="mb-2 text-lg font-medium text-foreground">No upcoming sessions</p>
                <p className="text-muted-foreground">Check back soon for scheduled group sessions!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {groupSessions.map((session) => {
                const isRegistered = registeredSessionIds.has(session.id)
                const sessionDate = new Date(session.session_date)
                const daysAway = Math.ceil((sessionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <Card key={session.id} className="group overflow-hidden border-border bg-card transition hover:border-primary/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="p-3 rounded-lg bg-primary/15 mt-0.5 shrink-0">
                              <Video className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="mb-1 text-lg font-bold text-foreground transition group-hover:text-primary">{session.title}</h4>
                              {session.description && <p className="mb-3 text-sm text-muted-foreground">{session.description}</p>}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2 text-foreground/80">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span className="font-mono font-medium">{sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground/80">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="font-mono font-medium">{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                            </div>
                            {session.max_participants && (
                              <div className="flex items-center gap-2 text-foreground/80">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="font-mono font-medium">Max {session.max_participants}</span>
                              </div>
                            )}
                            {daysAway === 0 && <StatusPill status="active" label="Today" />}
                            {daysAway === 1 && <StatusPill status="active" label="Tomorrow" />}
                            {daysAway > 1 && <StatusPill status="scheduled" label={`${daysAway} days`} />}
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
                          {session.zoom_join_url && isRegistered && (
                            <a href={session.zoom_join_url} target="_blank" rel="noopener noreferrer" className="block">
                              <Button size="sm" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 sm:w-auto">
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
                            className={isRegistered ? "cursor-default" : ""}
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
              isVisible={!hiddenSessionChats.has(groupSessions[0]?.id || "")}
              onToggleVisibility={(visible) => {
                const sessionId = groupSessions[0]?.id || ""
                if (visible) {
                  setHiddenSessionChats(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(sessionId)
                    return newSet
                  })
                } else {
                  setHiddenSessionChats(prev => new Set(prev).add(sessionId))
                }
              }}
            />
          )}
          </>)}
        </TabsContent>
        </main>
      </div>
    </Tabs>
  )
}
