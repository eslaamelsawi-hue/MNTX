import type { Metadata } from "next"
import { BirthdayOffer } from "@/components/birthday-offer"

export const dynamic = "force-dynamic"

/** The single-use coupon behind the offer. Its max_uses is what limits this
 *  to one person — once redeemed, the page closes itself. A different code
 *  can be used per occasion via ?code=. */
const DEFAULT_CODE = "BIRTHDAY50"

export const metadata: Metadata = {
  title: "هدية عيد الميلاد | Mentix Trading",
  description: "خصم خاص على المينتورشيب الفردي 1-1 — لشخص واحد فقط.",
}

export default async function BirthdayPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  return <BirthdayOffer code={code?.trim() || DEFAULT_CODE} />
}
