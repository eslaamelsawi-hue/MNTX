import type { Metadata } from "next"
import { ApplyMentorship } from "@/components/apply-mentorship"
import { getApprovedSeatsStatus } from "@/lib/mentorship-seats"
import { getMentorshipPricing } from "@/lib/mentorship-pricing"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const { discountPercent } = await getMentorshipPricing()
  return {
    title: "التقديم على المينتورشيب الفردي | Mentix Trading",
    description: `قدّم الآن للانضمام إلى مينتورشيب Mentix الفردي 1-1 واحصل على خصم ${discountPercent}% لدفعة أكتوبر.`,
  }
}

export default async function ApplyPage() {
  const [{ seatsFull, remaining }, { discountPercent }] = await Promise.all([
    getApprovedSeatsStatus(),
    getMentorshipPricing(),
  ])
  return <ApplyMentorship seatsFull={seatsFull} remaining={remaining} discountPercent={discountPercent} />
}
