import { cn } from "@/lib/utils"

const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400",
  paid: "text-emerald-400",
  completed: "text-emerald-400",
  published: "text-emerald-400",
  confirmed: "text-emerald-400",
  available: "text-emerald-400",
  read: "text-emerald-400",
  scheduled: "text-emerald-400",
  open: "text-emerald-400",
  redeemed: "text-emerald-400",
  pending: "text-amber-400",
  partially_paid: "text-amber-400",
  booked: "text-amber-400",
  rescheduled: "text-amber-400",
  "almost used": "text-amber-400",
  overdue: "text-red-400",
  cancelled: "text-red-400",
  expired: "text-red-400",
  inactive: "text-muted-foreground",
  draft: "text-muted-foreground",
  unread: "text-muted-foreground",
  full: "text-muted-foreground",
}

/** Small status indicator: a colored dot + label, consistent across every
 *  admin tab. Colors are looked up by the raw status string (snake/kebab or
 *  spaced), falling back to a neutral muted dot for unknown statuses. */
export function StatusPill({ status, label, className }: { status: string; label?: string; className?: string }) {
  const key = status.toLowerCase().trim()
  const color = STATUS_COLOR[key] || STATUS_COLOR[key.replace(/-/g, "_")] || STATUS_COLOR[key.replace(/_/g, " ")] || "text-muted-foreground"
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize", color, className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {(label ?? status).replace(/_/g, " ")}
    </span>
  )
}
