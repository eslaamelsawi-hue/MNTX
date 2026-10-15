import type { Metadata } from "next"
import { MentorshipCheckout } from "@/components/mentorship-checkout"

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
  return <MentorshipCheckout code={code} email={email} />
}
