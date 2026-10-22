import type { Metadata } from "next"
import { ProfitableFunnel } from "@/components/profitable-funnel"

export const dynamic = "force-dynamic"

/** Start of the October batch. The page counts down to this rather than
 *  hardcoding "8 days", which would be wrong by tomorrow. */
const BATCH_START = "2026-10-30"

export const metadata: Metadata = {
  title: "هل أنت متداول Profitable؟ | Mentix Trading",
  description: "نتائج موثّقة من شركات التمويل، ودفعة أكتوبر من المينتورشيب الفردي.",
}

export default function ProfitablePage() {
  const msPerDay = 24 * 60 * 60 * 1000
  const today = new Date(new Date().toISOString().slice(0, 10))
  const start = new Date(BATCH_START)
  const daysUntilBatch = Math.ceil((start.getTime() - today.getTime()) / msPerDay)

  return <ProfitableFunnel daysUntilBatch={daysUntilBatch} />
}
