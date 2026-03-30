import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import UnifiedCheckout from "@/components/unified-checkout"
import { PRODUCTS } from "@/lib/products"

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-20">
        <UnifiedCheckout products={PRODUCTS} initialPlan={plan} />
      </main>
      <Footer />
    </div>
  )
}