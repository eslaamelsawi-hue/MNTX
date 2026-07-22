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


