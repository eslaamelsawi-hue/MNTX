import type { Metadata } from "next"
import { ApplyMentorship } from "@/components/apply-mentorship"
import { getApprovedSeatsStatus } from "@/lib/mentorship-seats"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "التقديم على المينتورشيب الفردي | Mentix Trading",
  description: "قدّم الآن للانضمام إلى مينتورشيب Mentix الفردي 1-1 واحصل على خصم 40% لدفعة أكتوبر.",
}

export default async function ApplyPage() {
  const { seatsFull, remaining } = await getApprovedSeatsStatus()
  return <ApplyMentorship seatsFull={seatsFull} remaining={remaining} />
}
