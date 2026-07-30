"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Bell, Info, Receipt, Calendar, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  read: boolean
  created_at: string
}

const typeIcon: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  session: <Calendar className="h-4 w-4" />,
  system: <Megaphone className="h-4 w-4" />,
}

export function NotificationBell({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const t = useTranslations("notifications")
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setItems(d.notifications ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNotifications() }, [])

  const unreadCount = items.filter((n) => !n.read).length

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
  }

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
    if (n.link && onNavigate) onNavigate(n.link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 shrink-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">{t("title")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("loading")}</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-2.5 px-2 py-2.5 text-start text-sm transition-colors hover:bg-muted/60 ${!n.read ? "bg-primary/5" : ""}`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {typeIcon[n.type] || typeIcon.info}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-foreground">{n.title}</span>
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{new Date(n.created_at).toLocaleString()}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
