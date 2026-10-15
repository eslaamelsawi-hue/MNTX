import type { Metadata } from "next"
import { ConsultationBooking } from "@/components/consultation-booking"

export const metadata: Metadata = {
  title: "حجز استشارة فردية | Mentix Trading",
  description: "احجز استشارة فردية مع Mentix Trading — ١٠٠$ للساعة الأولى، ٨٠$ لكل ساعة إضافية.",
}

export default function ConsultationPage() {
  return <ConsultationBooking />
}
