"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Clock, Calendar, Mail, Loader2, CalendarPlus, Video,
  Users, MessageCircle, ExternalLink, CheckCircle2,
  XCircle, AlertCircle, Award, Zap, TrendingUp,
  LayoutDashboard, BookOpen, Repeat, LogOut,
} from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"

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
  availability_slots: Slot | null
}

type Settings = Record<string, string>

function isUpcoming(b: BookingRecord): boolean {
  if (!b.availability_slots?.date) return false
  const d = new Date(`${b.availability_slots.date}T${b.availability_slots.start_time || "00:00:00"}`)
  return d > new Date() && b.status !== "cancelled"
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? ""
}

const t: Record<"en" | "ar", Record<string, string>> = {
  en: {
    title: "Portal",
    subtitle: "Mentorship Hub",
    emailPlaceholder: "your@email.com",
    lookup: "Access Portal",
    loading: "Loading...",
    notFound: "No subscription found. Make sure you're using the email you registered with.",
    welcome: "Welcome",
    tabOverview: "Overview",
    tabMentorship: "Mentorship",
    tabSessions: "Sessions",
    tabFeed: "Activity",
    tabCommunity: "Community",
    tabWeeklyZoom: "Weekly Call",
    remainingHours: "Remaining",
    usedHours: "Used",
    totalHours: "Total Hours",
    nextSession: "Next Session",
    noNextSession: "No upcoming sessions",
    bookSession: "Book Session",
    joinZoom: "Join Meeting",
    plan: "Plan",
    status: "Status",
    active: "Active",
    expired: "Expired",
    cancelled: "Cancelled",
    expiresOn: "Expires",
    startsOn: "Started",
    hoursProgress: "Hours Progress",
    upcomingSessions: "Upcoming",
    pastSessions: "Past Sessions",
    noUpcoming: "No upcoming sessions",
    noPast: "No past sessions",
    confirmed: "Confirmed",
    completed: "Completed",
    rescheduled: "Rescheduled",
    sessionCancelled: "Cancelled",
    min: "min",
    duration: "Duration",
    date: "Date",
    time: "Time",
    activityFeed: "Recent Activity",
    noActivity: "No activity yet",
    sessionBooked: "Session Booked",
    sessionDone: "Session Completed",
    sessionCancelledFeed: "Session Cancelled",
    planActivated: "Plan Activated",
    communityTitle: "Community",
    communityDesc: "Connect with others",
    discordTitle: "Discord",
    discordDesc: "Join our community server",
    discordBtn: "Join Discord",
    telegramTitle: "Telegram",
    telegramDesc: "Real-time updates",
    telegramBtn: "Join Telegram",
    weeklyZoomTitle: "Weekly Group Call",
    weeklyZoomDesc: "Live session with mentor and community",
    weeklyZoomBtn: "Join Call",
    noZoomLink: "Link not available",
    totalSessions: "Sessions",
    subscriptionLabel: "Subscription",
    daysLeft: "days left",
    today: "Today",
    tomorrow: "Tomorrow",
  },
  ar: {
    title: "البوابة",
    subtitle: "مركز الإرشاد",
    emailPlaceholder: "بريدك@gmail.com",
    lookup: "الدخول",
    loading: "جارٍ التحميل...",
    notFound: "لم يتم العثور على اشتراك. تأكد من استخدام البريد الصحيح.",
    welcome: "مرحباً",
    tabOverview: "نظرة عامة",
    tabMentorship: "الإرشاد",
    tabSessions: "الجلسات",
    tabFeed: "النشاط",
    tabCommunity: "المجتمع",
    tabWeeklyZoom: "الاجتماع الأسبوعي",
    remainingHours: "المتبقية",
    usedHours: "المستخدمة",
    totalHours: "الإجمالي",
    nextSession: "الجلسة القادمة",
    noNextSession: "لا توجد جلسات قادمة",
    bookSession: "احجز جلسة",
    joinZoom: "انضم",
    plan: "الخطة",
    status: "الحالة",
    active: "نشط",
    expired: "منتهي",
    cancelled: "ملغي",
    expiresOn: "ينتهي",
    startsOn: "بدأ",
    hoursProgress: "تقدم الساعات",
    upcomingSessions: "القادمة",
    pastSessions: "السابقة",
    noUpcoming: "لا توجد جلسات قادمة",
    noPast: "لا توجد جلسات سابقة",
    confirmed: "مؤكد",
    completed: "مكتمل",
    rescheduled: "معاد جدولته",
    sessionCancelled: "ملغي",
    min: "دقيقة",
    duration: "المدة",
    date: "التاريخ",
    time: "الوقت",
    activityFeed: "النشاط الأخير",
    noActivity: "لا يوجد نشاط",
    sessionBooked: "تم حجز الجلسة",
    sessionDone: "اكتملت الجلسة",
    sessionCancelledFeed: "تم إلغاء الجلسة",
    planActivated: "تم تفعيل الخطة",
    communityTitle: "المجتمع",
    communityDesc: "تواصل مع الآخرين",
    discordTitle: "ديسكورد",
    discordDesc: "انضم للسيرفر",
    discordBtn: "ديسكورد",
    telegramTitle: "تيليجرام",
    telegramDesc: "تحديثات فورية",
    telegramBtn: "تيليجرام",
    weeklyZoomTitle: "الاجتماع الأسبوعي",
    weeklyZoomDesc: "جلسة مباشرة مع المرشد",
    weeklyZoomBtn: "انضم",
    noZoomLink: "الرابط غير متاح",
    totalSessions: "الجلسات",
    subscriptionLabel: "الاشتراك",
    daysLeft: "يوم",
    today: "اليوم",
    tomorrow: "غداً",
  },
}

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
        setSettings(data.settings ?? {})
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
    () => bookings.filter(isUpcoming).sort((a, b) => {
      const da = a.availability_slots?.date ?? ""
      const db = b.availability_slots?.date ?? ""
      return da.localeCompare(db)
    }),
    [bookings]
  )

  const nextSession = upcomingSessions[0] ?? null

  if (!looked || subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 mb-4">
              <Zap className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{l.title}</h1>
            <p className="text-slate-400 text-sm">{l.subtitle}</p>
          </div>

          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
            <CardContent className="pt-6">
              <form onSubmit={handleLookup} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder={l.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold h-10">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{l.loading}</> : l.lookup}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  const hoursUsedPct = activeSub ? Math.min(100, (activeSub.used_hours / activeSub.total_hours) * 100) : 0
  const userName = activeSub?.client_name ?? ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-slate-400 text-sm mb-1">{l.welcome},</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{userName}</h1>
          </div>
          <Link href={`/${locale}/booking`}>
            <Button className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              <CalendarPlus className="w-4 h-4" />
              {l.bookSession}
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Clock />} label={l.remainingHours} value={activeSub?.remaining_hours ?? 0} accent="blue" />
          <StatCard icon={<TrendingUp />} label={l.usedHours} value={activeSub?.used_hours ?? 0} accent="orange" />
          <StatCard icon={<Calendar />} label={l.totalSessions} value={bookings.length} accent="purple" />
          <StatCard icon={<Award />} label={l.status} value={activeSub?.status ?? "—"} accent="green" isText />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-800/50 border-slate-700/50 p-2 mb-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm"><LayoutDashboard className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{l.tabOverview}</span></TabsTrigger>
            <TabsTrigger value="mentorship" className="text-xs sm:text-sm"><BookOpen className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{l.tabMentorship}</span></TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{l.tabSessions}</span></TabsTrigger>
            <TabsTrigger value="feed" className="text-xs sm:text-sm"><TrendingUp className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{l.tabFeed}</span></TabsTrigger>
            <TabsTrigger value="community" className="text-xs sm:text-sm"><Users className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{l.tabCommunity}</span></TabsTrigger>
            <TabsTrigger value="zoom" className="text-xs sm:text-sm"><Video className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">{l.tabWeeklyZoom}</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {nextSession && (
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-amber-400 text-sm font-semibold mb-1">{l.nextSession}</p>
                      <p className="text-2xl font-bold text-white mb-2">{fmtDate(nextSession.availability_slots!.date)}</p>
                      <p className="text-amber-200/80 text-sm">{fmtTime(nextSession.availability_slots!.start_time)} — {fmtTime(nextSession.availability_slots!.end_time)}</p>
                    </div>
                    {nextSession.zoom_join_url && (
                      <a href={nextSession.zoom_join_url} target="_blank" rel="noopener noreferrer">
                        <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                          <Video className="w-4 h-4" />
                          {l.joinZoom}
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg">{l.hoursProgress}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">{activeSub?.used_hours} / {activeSub?.total_hours}</span>
                      <span className="text-amber-400 font-semibold">{Math.round(hoursUsedPct)}%</span>
                    </div>
                    <Progress value={hoursUsedPct} className="h-3" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{activeSub?.remaining_hours} {l.remainingHours}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg">{l.subscriptionLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-slate-400 text-sm">{l.plan}</p>
                    <p className="text-xl font-bold text-white capitalize">{activeSub?.plan}</p>
                  </div>
                  {activeSub?.expires_at && (
                    <div>
                      <p className="text-slate-400 text-sm">{l.expiresOn}</p>
                      <p className="text-white">{new Date(activeSub.expires_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mentorship">
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <Card key={sub.id} className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize text-lg">{sub.plan}</CardTitle>
                      <Badge className={sub.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-700 text-slate-300"}>{sub.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-900/50 p-3 rounded text-center">
                        <p className="text-slate-400 text-xs mb-1">{l.totalHours}</p>
                        <p className="text-2xl font-bold text-white">{sub.total_hours}</p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded text-center">
                        <p className="text-slate-400 text-xs mb-1">{l.usedHours}</p>
                        <p className="text-2xl font-bold text-orange-400">{sub.used_hours}</p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded text-center">
                        <p className="text-slate-400 text-xs mb-1">{l.remainingHours}</p>
                        <p className="text-2xl font-bold text-emerald-400">{sub.remaining_hours}</p>
                      </div>
                    </div>
                    <Progress value={Math.min(100, (sub.used_hours / sub.total_hours) * 100)} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sessions">
            <div className="space-y-6">
              {upcomingSessions.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">{l.noUpcoming}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((b) => (
                    <Card key={b.id} className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{fmtDate(b.availability_slots!.date)}</p>
                            <p className="text-sm text-slate-400">{fmtTime(b.availability_slots!.start_time)} • {b.duration}min</p>
                          </div>
                          {b.zoom_join_url && (
                            <a href={b.zoom_join_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                                <Video className="w-3.5 h-3.5" />
                                {l.joinZoom}
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="feed">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="py-8 text-center">
                <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{l.noActivity}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {settings.discord_invite && (
                <a href={settings.discord_invite} target="_blank" rel="noopener noreferrer">
                  <Card className="bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/50 transition cursor-pointer h-full">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-indigo-500/20">
                        <MessageCircle className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{l.discordTitle}</p>
                        <p className="text-sm text-slate-400">{l.discordDesc}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 ml-auto shrink-0" />
                    </CardContent>
                  </Card>
                </a>
              )}
              {settings.telegram_group && (
                <a href={settings.telegram_group} target="_blank" rel="noopener noreferrer">
                  <Card className="bg-slate-800/50 border-slate-700/50 hover:border-sky-500/50 transition cursor-pointer h-full">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-sky-500/20">
                        <Users className="w-6 h-6 text-sky-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{l.telegramTitle}</p>
                        <p className="text-sm text-slate-400">{l.telegramDesc}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 ml-auto shrink-0" />
                    </CardContent>
                  </Card>
                </a>
              )}
            </div>
          </TabsContent>

          <TabsContent value="zoom">
            {settings.weekly_zoom_link ? (
              <a href={settings.weekly_zoom_link} target="_blank" rel="noopener noreferrer">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 cursor-pointer hover:border-blue-500/50 transition">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-xl bg-blue-500/20">
                        <Video className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{l.weeklyZoomTitle}</h3>
                        <p className="text-blue-200/80">{l.weeklyZoomDesc}</p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-blue-400 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-400">{l.noZoomLink}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, accent, isText }: { icon: React.ReactNode; label: string; value: any; accent: string; isText?: boolean }) {
  const accentColors = {
    blue: "from-blue-500/10 to-blue-600/10 border-blue-500/30",
    orange: "from-orange-500/10 to-orange-600/10 border-orange-500/30",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-500/30",
    green: "from-green-500/10 to-green-600/10 border-green-500/30",
  }
  const iconColors = {
    blue: "text-blue-400",
    orange: "text-orange-400",
    purple: "text-purple-400",
    green: "text-green-400",
  }

  return (
    <Card className={`bg-gradient-to-br ${accentColors[accent as keyof typeof accentColors]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-5 h-5 ${iconColors[accent as keyof typeof iconColors]}`}>{icon}</div>
          <p className="text-slate-400 text-xs font-medium">{label}</p>
        </div>
        <p className="text-2xl font-bold text-white">{isText ? value : typeof value === "number" ? Math.round(value) : value}</p>
      </CardContent>
    </Card>
  )
}
