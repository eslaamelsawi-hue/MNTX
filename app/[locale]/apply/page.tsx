import type { Metadata } from "next"
import { ApplyMentorship } from "@/components/apply-mentorship"

export const metadata: Metadata = {
  title: "التقديم على المينتورشيب الفردي | Mentix Trading",
  description: "قدّم الآن للانضمام إلى مينتورشيب Mentix الفردي 1-1 واحصل على خصم 40% لدفعة أكتوبر.",
}

export default function ApplyPage() {
  return <ApplyMentorship />
}
