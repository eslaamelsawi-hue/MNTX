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