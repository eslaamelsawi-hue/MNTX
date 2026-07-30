"use client"

import { useMemo } from "react"
import { Activity, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
} from "recharts"

type Slot = { date: string; start_time: string; end_time: string }
type BookingRecord = {
  id: string
  duration: number
  status: string
  created_at: string
  availability_slots: Slot | null
}
type Subscription = {
  used_hours: number
  total_hours: number
  remaining_hours: number
}

const hoursChartConfig = {
  hours: { label: "Hours used", color: "hsl(var(--primary))" },
} satisfies ChartConfig

const sessionsChartConfig = {
  completed: { label: "Completed", color: "hsl(var(--primary))" },
  cancelled: { label: "Cancelled", color: "hsl(0 84% 60%)" },
} satisfies ChartConfig

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

export function DashboardProgress({
  subscriptions,
  bookings,
  l,
}: {
  subscriptions: Subscription[]
  bookings: BookingRecord[]
  l: Record<string, string>
}) {
  const activeSub = subscriptions.find((s) => s) ?? null
  const totalUsed = subscriptions.reduce((sum, s) => sum + (s.used_hours || 0), 0)
  const totalHours = subscriptions.reduce((sum, s) => sum + (s.total_hours || 0), 0)
  const overallPct = totalHours > 0 ? Math.min(100, (totalUsed / totalHours) * 100) : 0

  const hoursOverTime = useMemo(() => {
    const byMonth = new Map<string, number>()
    bookings
      .filter((b) => b.status === "completed" && b.availability_slots?.date)
      .forEach((b) => {
        const key = monthKey(b.availability_slots!.date)
        byMonth.set(key, (byMonth.get(key) || 0) + b.duration / 60)
      })
    const sortedKeys = Array.from(byMonth.keys()).sort()
    let cumulative = 0
    return sortedKeys.map((key) => {
      cumulative += byMonth.get(key)!
      return { month: monthLabel(key), hours: Math.round(cumulative * 10) / 10 }
    })
  }, [bookings])

  const sessionsPerMonth = useMemo(() => {
    const byMonth = new Map<string, { completed: number; cancelled: number }>()
    bookings
      .filter((b) => b.availability_slots?.date)
      .forEach((b) => {
        const key = monthKey(b.availability_slots!.date)
        const entry = byMonth.get(key) || { completed: 0, cancelled: 0 }
        if (b.status === "completed") entry.completed += 1
        else if (b.status === "cancelled") entry.cancelled += 1
        byMonth.set(key, entry)
      })
    return Array.from(byMonth.keys())
      .sort()
      .map((key) => ({ month: monthLabel(key), ...byMonth.get(key)! }))
  }, [bookings])

  const hasData = hoursOverTime.length > 0 || sessionsPerMonth.length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{l.tabProgress || "Progress"}</h2>
          <p className="text-xs text-muted-foreground">{l.progressSubtitle || "Your mentorship activity over time."}</p>
        </div>
      </div>

      {activeSub && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              {l.hoursProgress || "Hours progress"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{totalUsed} / {totalHours}</span>
              <span className="font-medium">{Math.round(overallPct)}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {!hasData ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            {l.progressNoData || "Not enough data yet — it'll fill in as you complete sessions."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {hoursOverTime.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{l.hoursOverTime || "Hours used over time"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={hoursChartConfig} className="aspect-auto h-56 w-full">
                  <AreaChart data={hoursOverTime} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="hours" type="monotone" fill="var(--color-hours)" fillOpacity={0.2} stroke="var(--color-hours)" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {sessionsPerMonth.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{l.sessionsPerMonth || "Sessions per month"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={sessionsChartConfig} className="aspect-auto h-56 w-full">
                  <BarChart data={sessionsPerMonth} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                    <Bar dataKey="cancelled" fill="var(--color-cancelled)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
