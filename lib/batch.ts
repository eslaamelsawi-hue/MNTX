/** Arabic month names as used in Egypt. */
const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]

/**
 * The batch currently open for applications: the live month in Cairo, so the
 * label rolls over at local midnight on the 1st without anyone editing copy.
 * Pages that show it must not be statically cached — force-dynamic, or a
 * revalidate short enough that the turn of the month is picked up.
 */
export function currentBatchMonth(now: Date = new Date()): string {
  const month = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", month: "numeric" }).format(now)
  )
  return AR_MONTHS[month - 1]
}
