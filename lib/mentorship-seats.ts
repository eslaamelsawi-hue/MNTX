import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

/** Only 5 approved mentorship seats per batch — once reached, the /apply
 *  form closes itself and new submissions are rejected server-side too. */
export const MAX_APPROVED_SEATS = 5

export async function getApprovedSeatsStatus(): Promise<{ approvedCount: number; seatsFull: boolean; remaining: number }> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from("mentorship_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")

  const approvedCount = error ? 0 : count ?? 0
  return {
    approvedCount,
    seatsFull: approvedCount >= MAX_APPROVED_SEATS,
    remaining: Math.max(0, MAX_APPROVED_SEATS - approvedCount),
  }
}
