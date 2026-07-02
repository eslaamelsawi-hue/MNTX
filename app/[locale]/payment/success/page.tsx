import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PaymentSuccess } from "@/components/payment-success"

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; order?: string; provider?: string; receipt_id?: string }>
}) {
  const { plan, order, provider, receipt_id } = await searchParams
  // Whop appends `receipt_id` on its post-checkout redirect; use it as the order ref.
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <PaymentSuccess plan={plan} order={order ?? receipt_id} provider={provider} />
      <Footer />
    </main>
  )
}
