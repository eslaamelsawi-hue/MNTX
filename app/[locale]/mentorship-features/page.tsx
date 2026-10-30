import type { Metadata } from "next"
import { MentorshipFeatures } from "@/components/mentorship-features"

export const metadata: Metadata = {
  title: "مميزات المينتورشيب الفردي | Mentix Trading",
  description: "كل ما تحصل عليه عند انضمامك لمينتورشيب Mentix الفردي 1-1 على مدار 6 أسابيع.",
}

export default function MentorshipFeaturesPage() {
  return <MentorshipFeatures />
}
