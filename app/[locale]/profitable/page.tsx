import type { Metadata } from "next"
import { ProfitableFunnel } from "@/components/profitable-funnel"
import { currentBatchMonth } from "@/lib/batch"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "هل أنت متداول Profitable؟ | Mentix Trading",
  description: "نتائج موثّقة من شركات التمويل، والمينتورشيب الفردي بدفعته الحالية.",
}

export default function ProfitablePage() {
  return <ProfitableFunnel batchMonth={currentBatchMonth()} />
}
