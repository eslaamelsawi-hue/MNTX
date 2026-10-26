import type { Metadata } from "next"
import { MentorshipCheckout } from "@/components/mentorship-checkout"
import { getMentorshipSplitForCoupon } from "@/lib/mentorship-pricing"

export const metadata: Metadata = {
  title: "إتمام التسجيل | Mentix Trading",
  description: "أكمل تسجيلك في مينتورشيب Mentix الفردي 1-1.",
}

export default async function MentorshipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>
}) {
  const { code, email } = await searchParams
  // Resolved server-side: the amounts decide what gets charged, so they must
  // not come from the URL.
  const split = code ? await getMentorshipSplitForCoupon(code) : null
  return <MentorshipCheckout code={code} email={email} split={split} />
}
