// Central timezone configuration for the entire site
// All dates/times in the system are in Africa/Cairo timezone

export const SITE_TIMEZONE = "Africa/Cairo"

/**
 * Get the current date/time in Cairo timezone
 */
export function nowCairo(): Date {
  const now = new Date()
  const cairoStr = now.toLocaleString("en-US", { timeZone: SITE_TIMEZONE })
  return new Date(cairoStr)
}

/**
 * Get today's date string (YYYY-MM-DD) in Cairo timezone
 */
export function todayCairo(): string {
  const d = nowCairo()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Format a Date object to YYYY-MM-DD in Cairo timezone
 */
export function formatDateCairo(date: Date): string {
  const cairoStr = date.toLocaleString("en-US", { timeZone: SITE_TIMEZONE })
  const d = new Date(cairoStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Convert a Cairo wall-clock date + time (as stored in availability_slots) to an
 * absolute UTC ISO instant, e.g. "2026-07-19" + "21:00:00" → "2026-07-19T18:00:00.000Z".
 * DST-aware (Egypt observes EEST). Use this when handing a start time to external
 * APIs (Zoom, Google Calendar) so there is zero ambiguity — never rely on the
 * provider to interpret a naive local time.
 */
export function cairoToUtcISO(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time // ensure HH:mm:ss
  // Cairo's UTC offset (ms) on that calendar date, DST included.
  const probe = new Date(`${date}T12:00:00Z`)
  const offsetMs =
    new Date(probe.toLocaleString("en-US", { timeZone: SITE_TIMEZONE })).getTime() -
    new Date(probe.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  // Treat the wall clock as UTC, then subtract the offset to get the true instant.
  return new Date(new Date(`${date}T${t}Z`).getTime() - offsetMs).toISOString()
}

/**
 * The inverse of cairoToUtcISO: given an absolute UTC instant, return the
 * Cairo wall-clock date + time it corresponds to. Used when a client picks a
 * custom booking time in their own timezone and we need to store it the same
 * way admin-created slots are stored (Cairo local date/time strings).
 */
export function utcIsoToCairo(isoString: string): { date: string; time: string } {
  const d = new Date(isoString)
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: SITE_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
  return { date, time: `${time}:00` }
}

/** Adds minutes to an "HH:mm:ss" time string, wrapping within the same day
 *  (sessions are short enough this is never expected to cross midnight). */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m, s] = time.split(":").map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}:${String(s || 0).padStart(2, "0")}`
}


