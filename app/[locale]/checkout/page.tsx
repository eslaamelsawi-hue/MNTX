import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import UnifiedCheckout from "@/components/unified-checkout"
import { PRODUCTS } from "@/lib/products"

// Only the 1-on-1 Coaching Plan is offered at checkout right now — every
// other package is hidden from this page's plan grid.
const CHECKOUT_PRODUCTS = PRODUCTS.filter((p) => p.id === "coaching")

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-20">
        <UnifiedCheckout products={CHECKOUT_PRODUCTS} initialPlan={plan} />
      </main>
      <Footer />
    </div>
  )
}