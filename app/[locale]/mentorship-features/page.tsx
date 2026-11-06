import type { Metadata } from "next"
import { MentorshipFeatures } from "@/components/mentorship-features"

// The batch label is derived from the current month, so this page can't be
// baked at build time.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "مميزات المينتورشيب الفردي | Mentix Trading",
  description: "كل ما تحصل عليه عند انضمامك لمينتورشيب Mentix الفردي 1-1 على مدار 6 أسابيع.",
}

export default function MentorshipFeaturesPage() {
  return <MentorshipFeatures />
}
