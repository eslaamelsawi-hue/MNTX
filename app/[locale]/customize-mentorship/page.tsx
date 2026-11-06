import type { Metadata } from "next"
import { CustomizeMentorship } from "@/components/customize-mentorship"

export const metadata: Metadata = {
  title: "صمّم منتورشيبك | Mentix Trading",
  description: "اختر عدد الجلسات وما تريد التركيز عليه، وادفع مقابل ما تحتاجه فقط.",
}

export default function CustomizeMentorshipPage() {
  return <CustomizeMentorship />
}
